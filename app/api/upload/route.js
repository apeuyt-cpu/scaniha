import { uploadToCloudinary } from "@/lib/cloudinary";
import { NextResponse } from "next/server";

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

/**
 * POST /api/upload
 *
 * Accepts two content types:
 *   1. application/json  → { image: "<base64 data URI or URL>" }
 *   2. multipart/form-data → FormData with a "file" field
 *
 * Returns: { success, secure_url, public_id }
 */
export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let fileToUpload;

    // ─── Handle multipart/form-data (real file upload) ─────────────
    let uploadFolder = "my-app"; // default folder
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      // Read optional folder override
      const folderField = formData.get("folder");
      if (folderField && typeof folderField === "string") {
        uploadFolder = folderField;
      }

      if (!file || typeof file === "string") {
        return NextResponse.json(
          { success: false, error: "No file provided in form data." },
          { status: 400 }
        );
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}`,
          },
          { status: 400 }
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
          },
          { status: 400 }
        );
      }

      // Convert file to base64 data URI for Cloudinary
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString("base64");
      const mimeType = file.type;
      fileToUpload = `data:${mimeType};base64,${base64}`;

    // ─── Handle JSON (base64 string or URL) ────────────────────────
    } else {
      const body = await request.json();
      const { image, folder } = body;

      if (folder) uploadFolder = folder;

      if (!image) {
        return NextResponse.json(
          { success: false, error: "No image provided. Send { image: '<base64 or URL>' }." },
          { status: 400 }
        );
      }

      fileToUpload = image;
    }

    // ─── Upload to Cloudinary ──────────────────────────────────────
    const result = await uploadToCloudinary(fileToUpload, { folder: uploadFolder });

    return NextResponse.json(
      {
        success: true,
        secure_url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "An unexpected error occurred during upload.",
      },
      { status: 500 }
    );
  }
}
