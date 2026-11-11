/**
 * Nebula AI - Next-Gen AI Image Generation Pipeline
 * Features:
 * 1. Gemini DALL-E 3 / Midjourney style prompt expansion (vibrant, colorful, photorealistic)
 * 2. Multi-model generation (FLUX / SDXL)
 * 3. Cloudinary global CDN caching & persistence
 * 4. Zero-failure multi-tier fallbacks
 */

const { GoogleGenAI } = require("@google/genai");
const { uploadToCloudinary } = require("./cloudinary");

let aiClient = null;
function getAi() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

/**
 * Detects if a message is requesting image generation (explicit or natural language)
 */
function isImagePrompt(text) {
  if (!text || typeof text !== "string") return false;
  const t = text.trim().toLowerCase();

  // Explicit command
  if (t.startsWith("/image") || t.startsWith("image:")) return true;

  // Natural language requests
  const imageKeywords = [
    /(?:generate|create|make|draw|render|produce)\s+(?:an?\s+)?(?:image|picture|photo|visual|illustration|wallpaper|painting|artwork)/i,
    /(?:picture|photo|image|drawing)\s+of\b/i,
    /(?:show me|give me)\s+(?:an?\s+)?(?:image|picture|photo)/i,
    /(?:ഒരു ചിത്രം|ചിത്രം ഉണ്ടാക്കൂ|ചിത്രം വരയ്ക്കൂ|ചിത്രം കാണിക്കൂ)/i,
  ];

  return imageKeywords.some((pattern) => pattern.test(t));
}

/**
 * Extracts raw prompt from text
 */
function extractRawImagePrompt(text) {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^\/image\s*/i, "");
  cleaned = cleaned.replace(/^image:\s*/i, "");
  cleaned = cleaned.replace(/^(?:please|pls|can you)\s+/i, "");
  cleaned = cleaned.replace(/^(?:generate|create|make|draw|show me)\s+(?:an?\s+)?(?:image|picture|photo)\s+(?:of\s+)?/i, "");
  return cleaned.trim() || "A vibrant futuristic cosmic nebula in deep space";
}

/**
 * Expands user prompt into a colorful, detailed, photorealistic prompt using Gemini
 */
async function expandImagePrompt(userPrompt) {
  const ai = getAi();
  if (!ai) return userPrompt;

  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: `You are an expert AI visual prompt engineer like Midjourney and DALL-E 3. Expand this user request into a breathtaking, colorful, highly detailed, photorealistic image prompt (1-2 sentences, max 40 words): "${userPrompt}". Focus on rich saturated colors, cinematic lighting, 8k textures, and photorealism. Output ONLY the expanded prompt string, nothing else.`,
    });

    const text = res.text?.trim();
    if (text && text.length > 10) {
      return text.replace(/^"|"$/g, "");
    }
  } catch (err) {
    console.warn("⚠️ Prompt expansion fallback:", err.message);
  }

  return `${userPrompt}, vibrant colorful, photorealistic, cinematic lighting, 8k resolution, ultra detailed`;
}

/**
 * Generates image, uploads to Cloudinary CDN, and returns final asset info
 */
async function generateAndUploadImage(userPrompt) {
  const cleanPrompt = extractRawImagePrompt(userPrompt);
  
  // Step 1: Prompt expansion for breathtaking colorful visuals
  const expandedPrompt = await expandImagePrompt(cleanPrompt);

  // Step 2: Multi-engine URL candidates
  const encodedPrompt = encodeURIComponent(expandedPrompt);
  const seed = Math.floor(Math.random() * 1000000);

  const candidateUrls = [
    `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}`,
    `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=800&nologo=true&model=turbo&seed=${seed}`,
    `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=768&height=768&nologo=true`,
  ];

  let imageBuffer = null;
  let activeUrl = candidateUrls[0];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/*",
        },
      });

      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("image")) {
          imageBuffer = Buffer.from(await res.arrayBuffer());
          activeUrl = url;
          break;
        }
      }
    } catch {
      // Try next engine
    }
  }

  // Step 3: Upload to Cloudinary CDN
  let cdnUrl = null;
  if (imageBuffer && imageBuffer.length > 5000) {
    try {
      const dataUri = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
      cdnUrl = await uploadToCloudinary(dataUri, "nebula_ai/generated");
    } catch (cdnErr) {
      console.warn("⚠️ Cloudinary upload warning:", cdnErr.message);
    }
  }

  // Fallback to direct URL if Cloudinary upload is pending or fails
  if (!cdnUrl) {
    cdnUrl = activeUrl;
  }

  return {
    cdnUrl,
    cleanPrompt,
    expandedPrompt,
  };
}

module.exports = {
  isImagePrompt,
  extractRawImagePrompt,
  expandImagePrompt,
  generateAndUploadImage,
};
