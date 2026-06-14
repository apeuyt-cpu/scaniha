/**
 * Storage → DB sync.
 * Lists every object in the public `menu-images` Supabase Storage bucket and
 * upserts metadata rows into the `images` table (used by the gallery).
 * Replaces the old Cloudinary sync; same exported API: runFullSync(options).
 */
import { createClient } from "@supabase/supabase-js";

const BUCKET = "menu-images";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Recursively list all files in the bucket (folders are traversed). */
async function listAllObjects(supabase, prefix = "") {
  const out = [];
  let page = 0;
  const LIMIT = 1000;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: LIMIT, offset: page * LIMIT, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`Storage list failed at "${prefix}": ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        // Folder — recurse
        const nested = await listAllObjects(supabase, path);
        out.push(...nested);
      } else {
        out.push({ path, metadata: entry.metadata || {}, updated_at: entry.updated_at });
      }
    }
    if (data.length < LIMIT) break;
    page += 1;
  }
  return out;
}

/**
 * Full sync: bucket listing → `images` table upserts.
 * options: { folder?: string, deleteStale?: boolean }
 * Returns stats: { fetched, upserted, deleted, errors, duration_ms }
 */
export async function runFullSync(options = {}) {
  const started = Date.now();
  const stats = { fetched: 0, upserted: 0, deleted: 0, errors: 0, duration_ms: 0 };
  const supabase = serviceClient();

  try {
    const objects = await listAllObjects(supabase, options.folder || "");
    stats.fetched = objects.length;

    const rows = objects.map((o) => {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(o.path);
      const ext = o.path.includes(".") ? o.path.split(".").pop().toLowerCase() : null;
      return {
        public_id: o.path,
        image_url: data.publicUrl,
        format: ext,
        width: null,
        height: null,
        bytes: o.metadata?.size ?? null,
        folder: o.path.includes("/") ? o.path.slice(0, o.path.lastIndexOf("/")) : null,
        tags: [],
        updated_at: new Date().toISOString(),
      };
    });

    // Upsert in chunks of 100
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const { error } = await supabase.from("images").upsert(chunk, { onConflict: "public_id" });
      if (error) {
        console.error("Sync upsert error:", error.message);
        stats.errors += 1;
      } else {
        stats.upserted += chunk.length;
      }
    }

    // Optionally remove DB rows whose file no longer exists in the bucket
    if (options.deleteStale) {
      const livePaths = new Set(rows.map((r) => r.public_id));
      const { data: existing, error } = await supabase.from("images").select("public_id");
      if (error) {
        stats.errors += 1;
      } else {
        const stale = (existing || []).map((r) => r.public_id).filter((p) => !livePaths.has(p));
        for (let i = 0; i < stale.length; i += 100) {
          const chunk = stale.slice(i, i + 100);
          const { error: delErr } = await supabase.from("images").delete().in("public_id", chunk);
          if (delErr) stats.errors += 1;
          else stats.deleted += chunk.length;
        }
      }
    }
  } catch (err) {
    console.error("Sync failed:", err);
    stats.errors += 1;
  }

  stats.duration_ms = Date.now() - started;
  return stats;
}
