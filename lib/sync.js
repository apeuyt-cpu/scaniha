import cloudinary from "@/lib/cloudinary";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase Admin Client (Service Role) ────────────────────────────
// Uses service role key for unrestricted write access to the images table.
// This client is ONLY used server-side for sync operations.
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables."
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Constants ───────────────────────────────────────────────────────
const CLOUDINARY_PAGE_SIZE = 100; // max allowed by Cloudinary Admin API
const SUPABASE_UPSERT_CHUNK = 100; // rows per upsert batch
const API_DELAY_MS = 500; // delay between Cloudinary API calls
const MAX_RETRIES = 3; // max retries on rate-limit (429)

// ─── Helpers ─────────────────────────────────────────────────────────

/** Sleep for `ms` milliseconds */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Map a Cloudinary resource object to our Supabase row shape.
 * @param {object} resource — Cloudinary resource from admin API
 * @returns {object}
 */
function mapResourceToRow(resource) {
  return {
    public_id: resource.public_id,
    image_url: resource.secure_url,
    format: resource.format || null,
    width: resource.width || null,
    height: resource.height || null,
    bytes: resource.bytes || null,
    folder: resource.folder || null,
    tags: resource.tags && resource.tags.length > 0 ? resource.tags : [],
  };
}

// ─── Core Functions ──────────────────────────────────────────────────

/**
 * Fetch ALL image resources from Cloudinary using cursor-based pagination.
 * Handles rate limiting with exponential backoff.
 *
 * @param {object} options
 * @param {string} [options.folder]  — Filter by Cloudinary folder
 * @param {string} [options.tag]     — Filter by Cloudinary tag
 * @param {string} [options.type]    — Resource type (default: "image")
 * @returns {Promise<object[]>} — Array of Cloudinary resource objects
 */
export async function fetchAllCloudinaryResources(options = {}) {
  const { folder, tag, type = "image" } = options;
  const allResources = [];
  let nextCursor = null;
  let pageNumber = 0;

  console.log("📡 Fetching resources from Cloudinary...");
  if (folder) console.log(`   📂 Folder filter: ${folder}`);
  if (tag) console.log(`   🏷️  Tag filter: ${tag}`);

  do {
    pageNumber++;
    let retries = 0;
    let response;

    while (retries <= MAX_RETRIES) {
      try {
        // Build API params
        const params = {
          resource_type: type,
          max_results: CLOUDINARY_PAGE_SIZE,
          ...(nextCursor && { next_cursor: nextCursor }),
        };

        // Use tag-based search or folder-based search
        if (tag) {
          response = await cloudinary.api.resources_by_tag(tag, params);
        } else {
          if (folder) {
            params.prefix = folder;
            params.type = "upload";
          }
          response = await cloudinary.api.resources(params);
        }

        break; // Success — exit retry loop
      } catch (err) {
        if (err?.http_code === 429 && retries < MAX_RETRIES) {
          retries++;
          const backoff = Math.pow(2, retries) * 1000;
          console.warn(
            `   ⚠️  Rate limited. Retrying in ${backoff / 1000}s (attempt ${retries}/${MAX_RETRIES})...`
          );
          await sleep(backoff);
        } else {
          throw err;
        }
      }
    }

    const resources = response.resources || [];
    allResources.push(...resources);
    nextCursor = response.next_cursor || null;

    console.log(
      `   📄 Page ${pageNumber}: fetched ${resources.length} resources (total: ${allResources.length})`
    );

    // Respect rate limits between pages
    if (nextCursor) {
      await sleep(API_DELAY_MS);
    }
  } while (nextCursor);

  console.log(`✅ Total resources fetched: ${allResources.length}`);
  return allResources;
}

/**
 * Upsert Cloudinary resources into Supabase `images` table.
 * Uses `public_id` as the conflict key — safe to run multiple times.
 *
 * @param {object[]} resources — Cloudinary resource objects
 * @returns {Promise<{ upserted: number, errors: number }>}
 */
export async function syncToSupabase(resources) {
  if (!resources || resources.length === 0) {
    console.log("ℹ️  No resources to sync.");
    return { upserted: 0, errors: 0 };
  }

  const supabase = getSupabaseAdmin();
  const rows = resources.map(mapResourceToRow);
  let totalUpserted = 0;
  let totalErrors = 0;

  console.log(`💾 Syncing ${rows.length} resources to Supabase...`);

  // Process in chunks to avoid payload size limits
  for (let i = 0; i < rows.length; i += SUPABASE_UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + SUPABASE_UPSERT_CHUNK);
    const chunkNum = Math.floor(i / SUPABASE_UPSERT_CHUNK) + 1;
    const totalChunks = Math.ceil(rows.length / SUPABASE_UPSERT_CHUNK);

    const { data, error } = await supabase
      .from("images")
      .upsert(chunk, {
        onConflict: "public_id",
        ignoreDuplicates: false, // update existing rows
      })
      .select("public_id");

    if (error) {
      console.error(
        `   ❌ Chunk ${chunkNum}/${totalChunks} failed:`,
        error.message
      );
      totalErrors += chunk.length;
    } else {
      totalUpserted += data?.length || chunk.length;
      console.log(
        `   ✅ Chunk ${chunkNum}/${totalChunks}: ${chunk.length} rows upserted`
      );
    }
  }

  console.log(
    `💾 Sync complete: ${totalUpserted} upserted, ${totalErrors} errors`
  );
  return { upserted: totalUpserted, errors: totalErrors };
}

/**
 * Remove rows from Supabase that no longer exist in Cloudinary.
 * Fetches all public_ids from both sources and deletes stale entries.
 *
 * @param {object} options
 * @param {string} [options.folder] — Scope delete sync to a specific folder
 * @returns {Promise<{ deleted: number, errors: number }>}
 */
export async function deleteStaleFromSupabase(options = {}) {
  const { folder } = options;
  const supabase = getSupabaseAdmin();

  console.log("🗑️  Checking for stale entries in Supabase...");

  // 1. Get all public_ids from Supabase
  let query = supabase.from("images").select("public_id");
  if (folder) {
    query = query.eq("folder", folder);
  }

  const { data: supabaseRows, error: fetchError } = await query;
  if (fetchError) {
    console.error("   ❌ Failed to fetch Supabase rows:", fetchError.message);
    return { deleted: 0, errors: 1 };
  }

  if (!supabaseRows || supabaseRows.length === 0) {
    console.log("   ℹ️  No rows in Supabase to check.");
    return { deleted: 0, errors: 0 };
  }

  // 2. Get all public_ids from Cloudinary
  const cloudinaryResources = await fetchAllCloudinaryResources({
    folder,
  });
  const cloudinaryIds = new Set(cloudinaryResources.map((r) => r.public_id));

  // 3. Find stale entries (in Supabase but NOT in Cloudinary)
  const staleIds = supabaseRows
    .map((row) => row.public_id)
    .filter((id) => !cloudinaryIds.has(id));

  if (staleIds.length === 0) {
    console.log("   ✅ No stale entries found.");
    return { deleted: 0, errors: 0 };
  }

  console.log(`   🗑️  Found ${staleIds.length} stale entries. Deleting...`);

  // 4. Delete in batches
  let totalDeleted = 0;
  let totalErrors = 0;

  for (let i = 0; i < staleIds.length; i += SUPABASE_UPSERT_CHUNK) {
    const batch = staleIds.slice(i, i + SUPABASE_UPSERT_CHUNK);
    const { error: deleteError, count } = await supabase
      .from("images")
      .delete()
      .in("public_id", batch);

    if (deleteError) {
      console.error("   ❌ Delete batch failed:", deleteError.message);
      totalErrors += batch.length;
    } else {
      totalDeleted += count || batch.length;
    }
  }

  console.log(
    `🗑️  Delete sync complete: ${totalDeleted} removed, ${totalErrors} errors`
  );
  return { deleted: totalDeleted, errors: totalErrors };
}

/**
 * Run a full sync: fetch from Cloudinary → upsert to Supabase → optionally delete stale.
 *
 * @param {object} options
 * @param {string}  [options.folder]       — Filter by Cloudinary folder
 * @param {string}  [options.tag]          — Filter by Cloudinary tag
 * @param {boolean} [options.deleteStale]  — Remove entries not in Cloudinary
 * @returns {Promise<object>} — Sync statistics
 */
export async function runFullSync(options = {}) {
  const { folder, tag, deleteStale = false } = options;
  const startTime = Date.now();

  console.log("\n🔄 ═══════════════════════════════════════════");
  console.log("   Cloudinary → Supabase Full Sync");
  console.log("═══════════════════════════════════════════════\n");

  const stats = {
    started_at: new Date().toISOString(),
    folder: folder || "all",
    tag: tag || "none",
    fetched: 0,
    upserted: 0,
    deleted: 0,
    errors: 0,
    duration_ms: 0,
  };

  try {
    // Step 1: Fetch from Cloudinary
    const resources = await fetchAllCloudinaryResources({ folder, tag });
    stats.fetched = resources.length;

    // Step 2: Upsert to Supabase
    const syncResult = await syncToSupabase(resources);
    stats.upserted = syncResult.upserted;
    stats.errors += syncResult.errors;

    // Step 3: Delete stale entries (optional)
    if (deleteStale) {
      const deleteResult = await deleteStaleFromSupabase({ folder });
      stats.deleted = deleteResult.deleted;
      stats.errors += deleteResult.errors;
    }
  } catch (err) {
    console.error("❌ Sync failed with error:", err.message);
    stats.errors++;
    stats.error_message = err.message;
  }

  stats.duration_ms = Date.now() - startTime;

  console.log("\n📊 ═══════════════════════════════════════════");
  console.log("   Sync Summary");
  console.log("═══════════════════════════════════════════════");
  console.log(`   📡 Fetched:  ${stats.fetched}`);
  console.log(`   💾 Upserted: ${stats.upserted}`);
  console.log(`   🗑️  Deleted:  ${stats.deleted}`);
  console.log(`   ❌ Errors:   ${stats.errors}`);
  console.log(`   ⏱️  Duration: ${stats.duration_ms}ms`);
  console.log("═══════════════════════════════════════════════\n");

  return stats;
}

/**
 * Upsert a single resource into Supabase.
 * Used by webhook handler for real-time sync.
 *
 * @param {object} resource — Cloudinary resource (or notification data)
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function upsertSingleImage(resource) {
  const supabase = getSupabaseAdmin();
  const row = mapResourceToRow(resource);

  const { error } = await supabase
    .from("images")
    .upsert(row, { onConflict: "public_id" });

  if (error) {
    console.error("❌ Single upsert failed:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a single image from Supabase by public_id.
 * Used by webhook handler for real-time delete sync.
 *
 * @param {string} publicId
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteSingleImage(publicId) {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("images")
    .delete()
    .eq("public_id", publicId);

  if (error) {
    console.error("❌ Single delete failed:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
