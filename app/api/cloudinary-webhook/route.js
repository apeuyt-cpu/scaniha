import { NextResponse } from "next/server";
import { upsertSingleImage, deleteSingleImage } from "@/lib/sync";
import crypto from "crypto";

/**
 * POST /api/cloudinary-webhook
 *
 * Receives Cloudinary notification webhooks for real-time sync.
 *
 * Supported notification types:
 *   - upload    → upsert image metadata into Supabase
 *   - delete    → remove image metadata from Supabase
 *   - rename    → update image metadata in Supabase
 *
 * Cloudinary webhook payload structure:
 *   {
 *     notification_type: "upload" | "delete" | "rename" | ...,
 *     public_id: "folder/image_name",
 *     secure_url: "https://res.cloudinary.com/...",
 *     ...resource fields
 *   }
 *
 * Setup in Cloudinary Dashboard:
 *   Settings → Notifications → Webhook URL → https://yourdomain.com/api/cloudinary-webhook
 */
export async function POST(request) {
  try {
    // ─── Read raw body for signature verification ────────────────────
    const rawBody = await request.text();
    let payload;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    // ─── Verify webhook signature (if secret is configured) ─────────
    const webhookSecret = process.env.CLOUDINARY_WEBHOOK_SECRET;

    if (webhookSecret) {
      const signature = request.headers.get("x-cld-signature");
      const timestamp = request.headers.get("x-cld-timestamp");

      if (!signature || !timestamp) {
        return NextResponse.json(
          { success: false, error: "Missing webhook signature headers." },
          { status: 401 }
        );
      }

      // Verify timestamp is not too old (5 minute window)
      const now = Math.floor(Date.now() / 1000);
      const webhookTimestamp = parseInt(timestamp, 10);
      if (Math.abs(now - webhookTimestamp) > 300) {
        return NextResponse.json(
          { success: false, error: "Webhook timestamp expired." },
          { status: 401 }
        );
      }

      // Verify HMAC signature
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody + timestamp)
        .digest("hex");

      if (signature !== expectedSignature) {
        return NextResponse.json(
          { success: false, error: "Invalid webhook signature." },
          { status: 401 }
        );
      }
    }

    // ─── Handle notification types ───────────────────────────────────
    const notificationType = payload.notification_type;
    console.log(`📡 Cloudinary webhook: ${notificationType}`, payload.public_id);

    switch (notificationType) {
      case "upload": {
        // New image uploaded or existing overwritten
        const resource = {
          public_id: payload.public_id,
          secure_url: payload.secure_url,
          format: payload.format,
          width: payload.width,
          height: payload.height,
          bytes: payload.bytes,
          folder: payload.asset_folder || payload.folder || extractFolder(payload.public_id),
          tags: payload.tags || [],
        };

        const result = await upsertSingleImage(resource);

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          action: "upserted",
          public_id: payload.public_id,
        });
      }

      case "delete": {
        // Image deleted from Cloudinary
        const publicId =
          payload.public_id ||
          (payload.resources && payload.resources[0]?.public_id);

        if (!publicId) {
          return NextResponse.json(
            { success: false, error: "No public_id in delete notification." },
            { status: 400 }
          );
        }

        // Handle bulk deletes
        if (payload.resources && Array.isArray(payload.resources)) {
          const results = [];
          for (const res of payload.resources) {
            const r = await deleteSingleImage(res.public_id);
            results.push({ public_id: res.public_id, ...r });
          }
          return NextResponse.json({
            success: true,
            action: "deleted_bulk",
            results,
          });
        }

        const result = await deleteSingleImage(publicId);
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          action: "deleted",
          public_id: publicId,
        });
      }

      case "rename": {
        // Image renamed — delete old, insert new
        if (payload.from_public_id) {
          await deleteSingleImage(payload.from_public_id);
        }

        const resource = {
          public_id: payload.public_id || payload.to_public_id,
          secure_url: payload.secure_url,
          format: payload.format,
          width: payload.width,
          height: payload.height,
          bytes: payload.bytes,
          folder: extractFolder(payload.public_id || payload.to_public_id),
          tags: payload.tags || [],
        };

        const result = await upsertSingleImage(resource);
        return NextResponse.json({
          success: result.success,
          action: "renamed",
          from: payload.from_public_id,
          to: resource.public_id,
        });
      }

      default: {
        // Unsupported notification type — acknowledge but skip
        console.log(`ℹ️  Ignoring notification type: ${notificationType}`);
        return NextResponse.json({
          success: true,
          action: "ignored",
          notification_type: notificationType,
        });
      }
    }
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cloudinary-webhook
 * Health check for the webhook endpoint.
 */
export async function GET() {
  return NextResponse.json({
    service: "cloudinary-webhook",
    status: "active",
    message: "POST Cloudinary notifications to this endpoint.",
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Extract folder from public_id (e.g., "my-app/photo1" → "my-app")
 */
function extractFolder(publicId) {
  if (!publicId) return null;
  const parts = publicId.split("/");
  return parts.length > 1 ? parts.slice(0, -1).join("/") : null;
}
