import { NextResponse } from "next/server";
import { runFullSync } from "@/lib/sync";

/**
 * POST /api/sync-images
 *
 * Triggers a manual Supabase Storage → `images` table sync.
 * Requires SUPABASE_SERVICE_ROLE_KEY configured server-side.
 *
 * Body (optional JSON):
 *   { folder?: string, deleteStale?: boolean }
 *
 * Returns:
 *   { success: boolean, stats: {...} }
 */
export async function POST(request) {
  try {
    // ─── Auth Check ──────────────────────────────────────────────────
    // Verify the request is authorized. In production, add proper auth.
    // For now, we check for a simple API key or admin session.
    // Fail CLOSED: a valid API key (if configured) OR an authenticated
    // super-admin session is required. Never run an unauthenticated
    // service-role sync, even when SYNC_API_KEY is unset.
    const authHeader = request.headers.get("authorization");
    const apiKey = process.env.SYNC_API_KEY;
    const hasValidKey = !!apiKey && authHeader === `Bearer ${apiKey}`;

    if (!hasValidKey) {
      const { createServerClient } = await import("@/lib/supabase/server");
      const authClient = await createServerClient();
      const { data: { user } } = await authClient.auth.getUser();
      const { data: profile } = user
        ? await authClient.from("profiles").select("role").eq("user_id", user.id).maybeSingle()
        : { data: null };
      if (!user || profile?.role !== "super_admin") {
        return NextResponse.json(
          { success: false, error: "Accès non autorisé." },
          { status: 401 }
        );
      }
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
        error: error.message || "La synchronisation a échoué de manière inattendue.",
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
    service: "storage-supabase-sync",
    status: "ready",
    endpoints: {
      "POST /api/sync-images": "Trigger full sync (Supabase Storage → images table)",
    },
  });
}
