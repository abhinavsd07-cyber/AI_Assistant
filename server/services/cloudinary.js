const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "drxsezyyl",
  api_key: process.env.CLOUDINARY_API_KEY || "385376621762191",
  api_secret: process.env.CLOUDINARY_API_SECRET || "KrBka87CJYxFwoGk2GwmUHTwpEc",
});

/**
 * Uploads base64 or remote URL to Cloudinary CDN
 * @param {string} fileData - Base64 string, data URI, or remote HTTP/HTTPS URL
 * @param {string} folder - Destination folder on Cloudinary
 * @returns {Promise<string|null>} - Returns secure HTTPS URL on Cloudinary CDN
 */
async function uploadToCloudinary(fileData, folder = "nebula_ai/generated") {
  if (!fileData) return null;

  try {
    let source = fileData;
    if (!source.startsWith("http://") && !source.startsWith("https://") && !source.startsWith("data:")) {
      source = `data:image/jpeg;base64,${fileData}`;
    }

    const uploadRes = await cloudinary.uploader.upload(source, {
      folder,
      resource_type: "image",
    });

    return uploadRes?.secure_url || null;
  } catch (err) {
    console.warn("⚠️ Cloudinary upload warning:", err.message);
    return null;
  }
}

module.exports = { cloudinary, uploadToCloudinary };
