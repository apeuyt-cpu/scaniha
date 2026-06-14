import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/images
 *
 * Fetch images from the Supabase `images` table.
 * Used by the frontend gallery for pagination and filtering.
 *
 * Query params:
 *   - offset (default: 0)
 *   - limit  (default: 20, max: 100)
 *   - folder (optional filter)
 *   - tag    (optional filter)
 *   - sort   (default: "created_at", options: "created_at", "bytes")
 *   - order  (default: "desc", options: "asc", "desc")
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const folder = searchParams.get("folder") || null;
    const tag = searchParams.get("tag") || null;
    const sort = searchParams.get("sort") || "created_at";
    const order = searchParams.get("order") === "asc" ? true : false; // ascending = true

    // Use anon key for read-only access (RLS allows public read)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Build query
    let query = supabase
      .from("images")
      .select("*", { count: "exact" })
      .order(sort, { ascending: order })
      .range(offset, offset + limit - 1);

    if (folder) {
      query = query.eq("folder", folder);
    }

    if (tag) {
      query = query.contains("tags", [tag]);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      images: data || [],
      total: count || 0,
      offset,
      limit,
    });
  } catch (error) {
    console.error("Images API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Échec du chargement des images." },
      { status: 500 }
    );
  }
}
