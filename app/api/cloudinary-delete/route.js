import { NextResponse } from "next/server";
import { deleteFromCloudinary } from "@/lib/cloudinary";

/**
 * POST /api/cloudinary-delete
 *
 * Deletes an image from Cloudinary by public_id.
 * Called by the client-side storage helper when removing images.
 *
 * Body: { publicId: string }
 */
export async function POST(request) {
  try {
    const { publicId } = await request.json();

    if (!publicId) {
      return NextResponse.json(
        { success: false, error: "No publicId provided." },
        { status: 400 }
      );
    }

    const result = await deleteFromCloudinary(publicId);

    return NextResponse.json({
      success: true,
      result: result.result || "ok",
    });
  } catch (error) {
    console.error("Cloudinary Delete Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete from Cloudinary.",
      },
      { status: 500 }
    );
  }
}
