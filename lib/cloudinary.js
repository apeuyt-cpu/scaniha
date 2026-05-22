import { v2 as cloudinary } from "cloudinary";

// ─── Environment variable validation ────────────────────────────────
const requiredEnvVars = {
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  throw new Error(
    `❌ Missing Cloudinary environment variables: ${missingVars.join(", ")}. ` +
      `Please add them to your .env file.`
  );
}

// ─── Configure Cloudinary ────────────────────────────────────────────
cloudinary.config({
  cloud_name: requiredEnvVars.CLOUDINARY_CLOUD_NAME,
  api_key: requiredEnvVars.CLOUDINARY_API_KEY,
  api_secret: requiredEnvVars.CLOUDINARY_API_SECRET,
  secure: true,
});

// ─── Helper: Upload to Cloudinary ────────────────────────────────────
/**
 * Upload a file to Cloudinary.
 * @param {string} file    — base64 data URI or remote URL
 * @param {object} options — override upload options
 * @returns {Promise<import("cloudinary").UploadApiResponse>}
 */
export async function uploadToCloudinary(file, options = {}) {
  const defaultOptions = {
    folder: "my-app",
    resource_type: "auto",
    ...options,
  };

  return cloudinary.uploader.upload(file, defaultOptions);
}

/**
 * Delete a resource from Cloudinary by public_id.
 * @param {string} publicId
 * @returns {Promise<import("cloudinary").DeleteApiResponse>}
 */
export async function deleteFromCloudinary(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
