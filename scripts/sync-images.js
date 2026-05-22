#!/usr/bin/env node

/**
 * Cloudinary → Supabase Image Sync CLI
 *
 * Usage:
 *   node scripts/sync-images.js
 *   node scripts/sync-images.js --folder my-app
 *   node scripts/sync-images.js --tag hero --delete-stale
 *
 * Options:
 *   --folder <name>    Filter by Cloudinary folder
 *   --tag <name>       Filter by Cloudinary tag
 *   --delete-stale     Remove Supabase entries that no longer exist in Cloudinary
 *   --help             Show this help message
 */

// ─── Load environment variables BEFORE any imports ───────────────────
import "dotenv/config";

// ─── Now import the sync engine ──────────────────────────────────────
// Since this script uses ES module imports with path aliases,
// we need to use a dynamic approach with the Supabase client directly.
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";

// ─── Parse CLI arguments ─────────────────────────────────────────────
const args = process.argv.slice(2);

function getFlag(name) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  // Boolean flag (no value)
  if (name === "delete-stale" || name === "help") return true;
  // Value flag
  return args[idx + 1] || undefined;
}

if (getFlag("help")) {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║       Cloudinary → Supabase Image Sync CLI               ║
╚══════════════════════════════════════════════════════════╝

Usage:
  node scripts/sync-images.js [options]

Options:
  --folder <name>    Filter by Cloudinary folder
  --tag <name>       Filter by Cloudinary tag
  --delete-stale     Remove stale Supabase entries
  --help             Show this help message

Examples:
  node scripts/sync-images.js
  node scripts/sync-images.js --folder my-app
  node scripts/sync-images.js --tag hero --delete-stale
  npm run sync:images -- --folder my-app
`);
  process.exit(0);
}

const folder = getFlag("folder");
const tag = getFlag("tag");
const deleteStale = !!getFlag("delete-stale");

// ─── Validate environment ────────────────────────────────────────────
const required = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`\n❌ Missing environment variables:\n   ${missing.join("\n   ")}`);
  console.error("\n   Make sure your .env file is in the project root.\n");
  process.exit(1);
}

// ─── Configure Cloudinary ────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ─── Configure Supabase ──────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── Constants ───────────────────────────────────────────────────────
const PAGE_SIZE = 100;
const UPSERT_CHUNK = 100;
const API_DELAY = 500;
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function mapResource(r) {
  return {
    public_id: r.public_id,
    image_url: r.secure_url,
    format: r.format || null,
    width: r.width || null,
    height: r.height || null,
    bytes: r.bytes || null,
    folder: r.folder || null,
    tags: r.tags && r.tags.length > 0 ? r.tags : [],
  };
}

// ─── Fetch All Resources ─────────────────────────────────────────────
async function fetchAll() {
  const all = [];
  let cursor = null;
  let page = 0;

  console.log("📡 Fetching from Cloudinary...");
  if (folder) console.log(`   📂 Folder: ${folder}`);
  if (tag) console.log(`   🏷️  Tag: ${tag}`);

  do {
    page++;
    let res;
    let retries = 0;

    while (retries <= MAX_RETRIES) {
      try {
        const params = {
          resource_type: "image",
          max_results: PAGE_SIZE,
          ...(cursor && { next_cursor: cursor }),
        };

        if (tag) {
          res = await cloudinary.api.resources_by_tag(tag, params);
        } else {
          if (folder) {
            params.prefix = folder;
            params.type = "upload";
          }
          res = await cloudinary.api.resources(params);
        }
        break;
      } catch (err) {
        if (err?.http_code === 429 && retries < MAX_RETRIES) {
          retries++;
          const wait = Math.pow(2, retries) * 1000;
          console.warn(`   ⚠️  Rate limited. Retry in ${wait / 1000}s...`);
          await sleep(wait);
        } else {
          throw err;
        }
      }
    }

    const resources = res.resources || [];
    all.push(...resources);
    cursor = res.next_cursor || null;
    console.log(`   📄 Page ${page}: ${resources.length} items (total: ${all.length})`);

    if (cursor) await sleep(API_DELAY);
  } while (cursor);

  return all;
}

// ─── Upsert to Supabase ──────────────────────────────────────────────
async function upsertAll(resources) {
  const rows = resources.map(mapResource);
  let upserted = 0;
  let errors = 0;

  console.log(`💾 Upserting ${rows.length} rows to Supabase...`);

  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    const n = Math.floor(i / UPSERT_CHUNK) + 1;
    const total = Math.ceil(rows.length / UPSERT_CHUNK);

    const { data, error } = await supabase
      .from("images")
      .upsert(chunk, { onConflict: "public_id", ignoreDuplicates: false })
      .select("public_id");

    if (error) {
      console.error(`   ❌ Chunk ${n}/${total}: ${error.message}`);
      errors += chunk.length;
    } else {
      upserted += data?.length || chunk.length;
      console.log(`   ✅ Chunk ${n}/${total}: ${chunk.length} rows`);
    }
  }

  return { upserted, errors };
}

// ─── Delete Stale ────────────────────────────────────────────────────
async function deleteStaleEntries(cloudinaryIds) {
  console.log("🗑️  Checking for stale entries...");

  let query = supabase.from("images").select("public_id");
  if (folder) query = query.eq("folder", folder);

  const { data: rows, error } = await query;
  if (error) {
    console.error("   ❌ Failed to fetch Supabase rows:", error.message);
    return { deleted: 0, errors: 1 };
  }

  if (!rows || rows.length === 0) {
    console.log("   ℹ️  No rows to check.");
    return { deleted: 0, errors: 0 };
  }

  const idSet = new Set(cloudinaryIds);
  const stale = rows.map((r) => r.public_id).filter((id) => !idSet.has(id));

  if (stale.length === 0) {
    console.log("   ✅ No stale entries.");
    return { deleted: 0, errors: 0 };
  }

  console.log(`   🗑️  Deleting ${stale.length} stale entries...`);
  let deleted = 0;
  let errs = 0;

  for (let i = 0; i < stale.length; i += UPSERT_CHUNK) {
    const batch = stale.slice(i, i + UPSERT_CHUNK);
    const { error: delErr } = await supabase
      .from("images")
      .delete()
      .in("public_id", batch);

    if (delErr) {
      console.error("   ❌ Delete failed:", delErr.message);
      errs += batch.length;
    } else {
      deleted += batch.length;
    }
  }

  return { deleted, errors: errs };
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║       🔄 Cloudinary → Supabase Image Sync              ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const start = Date.now();
  const stats = { fetched: 0, upserted: 0, deleted: 0, errors: 0 };

  try {
    // Step 1: Fetch
    const resources = await fetchAll();
    stats.fetched = resources.length;

    // Step 2: Upsert
    const syncResult = await upsertAll(resources);
    stats.upserted = syncResult.upserted;
    stats.errors += syncResult.errors;

    // Step 3: Delete stale (optional)
    if (deleteStale) {
      const cloudinaryIds = resources.map((r) => r.public_id);
      const delResult = await deleteStaleEntries(cloudinaryIds);
      stats.deleted = delResult.deleted;
      stats.errors += delResult.errors;
    }
  } catch (err) {
    console.error("\n❌ Fatal error:", err.message);
    stats.errors++;
  }

  const duration = Date.now() - start;

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║       📊 Sync Results                                   ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  📡 Fetched from Cloudinary:  ${String(stats.fetched).padStart(8)}              ║`);
  console.log(`║  💾 Upserted to Supabase:     ${String(stats.upserted).padStart(8)}              ║`);
  console.log(`║  🗑️  Deleted stale:            ${String(stats.deleted).padStart(8)}              ║`);
  console.log(`║  ❌ Errors:                   ${String(stats.errors).padStart(8)}              ║`);
  console.log(`║  ⏱️  Duration:             ${String(duration + "ms").padStart(12)}              ║`);
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  process.exit(stats.errors > 0 ? 1 : 0);
}

main();
