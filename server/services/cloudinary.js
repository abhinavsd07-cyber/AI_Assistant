const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "drxsezyyl",
  api_key: process.env.CLOUDINARY_API_KEY || "385376621762191",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

/**
 * Uploads base64 or file data to Cloudinary CDN
 * @param {string} fileData - Base64 string or data URI
 * @param {string} folder - Destination folder on Cloudinary
 * @returns {Promise<string|null>} - Returns secure HTTPS URL on Cloudinary CDN
 */
async function uploadToCloudinary(fileData, folder = "nebula_ai") {
  if (!process.env.CLOUDINARY_API_SECRET) {
    // Graceful fallback if user has not yet pasted their API secret in .env
    return null;
  }

  try {
    const uri = fileData.startsWith("data:")
      ? fileData
      : `data:image/jpeg;base64,${fileData}`;

    const uploadRes = await cloudinary.uploader.upload(uri, {
      folder,
      resource_type: "auto",
    });

    return uploadRes.secure_url;
  } catch (err) {
    console.warn("⚠️ Cloudinary upload warning:", err.message);
    return null;
  }
}

module.exports = { cloudinary, uploadToCloudinary };

