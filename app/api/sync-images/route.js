import { NextResponse } from "next/server";
import { runFullSync } from "@/lib/sync";

/**
 * POST /api/sync-images
 *
 * Triggers a manual Cloudinary → Supabase sync.
 * Requires SUPABASE_SERVICE_ROLE_KEY configured server-side.
 *
 * Body (optional JSON):
 *   { folder?: string, tag?: string, deleteStale?: boolean }
 *
 * Returns:
 *   { success: boolean, stats: {...} }
 */
export async function POST(request) {
  try {
    // ─── Auth Check ──────────────────────────────────────────────────
    // Verify the request is authorized. In production, add proper auth.
    // For now, we check for a simple API key or admin session.
    const authHeader = request.headers.get("authorization");
    const apiKey = process.env.SYNC_API_KEY; // Optional: set in .env

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Provide valid API key." },
        { status: 401 }
      );
    }

    // ─── Parse Options ───────────────────────────────────────────────
    let options = {};
    try {
      const body = await request.json();
      options = {
        folder: body.folder || undefined,
        tag: body.tag || undefined,
        deleteStale: body.deleteStale === true,
      };
    } catch {
      // No body — run with defaults
    }

    // ─── Run Sync ────────────────────────────────────────────────────
    const stats = await runFullSync(options);

    return NextResponse.json(
      {
        success: stats.errors === 0,
        stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Sync API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Sync failed unexpectedly.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync-images
 *
 * Returns sync status / health check.
 */
export async function GET() {
  return NextResponse.json({
    service: "cloudinary-supabase-sync",
    status: "ready",
    endpoints: {
      "POST /api/sync-images": "Trigger full sync",
      "POST /api/cloudinary-webhook": "Cloudinary webhook receiver",
    },
  });
}
