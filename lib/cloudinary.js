import { v2 as cloudinary } from "cloudinary";

function getCloudinaryConfig() {
  const config = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  };

  const missing = Object.entries(config)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(
      `Missing Cloudinary environment variables: ${missing.join(", ")}. Please add them to your .env file.`
    );
  }

  return config;
}

function ensureConfigured() {
  const cfg = getCloudinaryConfig();
  cloudinary.config({ ...cfg, secure: true });
}

export async function uploadToCloudinary(file, options = {}) {
  ensureConfigured();
  return cloudinary.uploader.upload(file, { folder: "my-app", resource_type: "auto", ...options });
}

export async function deleteFromCloudinary(publicId) {
  ensureConfigured();
  return cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
