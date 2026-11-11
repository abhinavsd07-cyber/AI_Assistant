/**
 * Nebula AI - Deep Understanding & ML-Powered Image Pipeline
 * Uses Gemini NLP for Zero-Shot Intent Classification, Typo Correction,
 * Phonetic/Manglish Understanding, and High-Resolution Cloudinary CDN Delivery.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
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
 * Fast synchronous check to detect if text likely contains an image generation intent
 * Handles typos, visual descriptions, scene prompts, and explicit keywords.
 */
function isImagePrompt(text) {
  if (!text || typeof text !== "string") return false;
  const t = text.trim();
  if (/^\/(?:image|img)\b/i.test(t)) return true;

  // Direct image/creation keywords & typos
  const hasImageKeywords = /(?:img|imag|pict|pik|foto|phot|drw|draw|pain|gener|creat|mak|varakk|padam|chithr|wallpaper|ചിത്രം|ഫോട്ടോ|പടം|വര)/i.test(t);
  if (hasImageKeywords) return true;

  // Visual scene / character / vehicle / art descriptors without explicit question words
  const isQuestion = /^(?:what|why|how|when|where|who|which|explain|tell|is|are|can|could|should|do|does|did|ആരാണ്|എന്താണ്|എങ്ങനെ|എവിടെ)/i.test(t);
  if (!isQuestion && t.length < 150) {
    const hasVisualScene = /(?:car|cars|superhero|superheroes|super heros|batman|spiderman|superman|portrait|landscape|illustration|anime|cyberpunk|futuristic|cinematic|vintage|retro|neon|sunset|ocean|nature|space|galaxy|robot|animal|cat|dog|lion|tiger|dragon|castle|city|street|room|building|driving|flying|running|standing|sitting|wearing)/i.test(t);
    if (hasVisualScene) return true;
  }

  return false;
}

/**
 * ML Zero-Shot Semantic Intent Classifier & Typo Normalizer
 * Understands typos, slang, broken grammar, Manglish, and Malayalam.
 */
async function classifyUserIntent(userText) {
  if (!userText || typeof userText !== "string") {
    return { isImage: false, cleanSubject: "", cleanPrompt: "", isRealEntity: false, expandedPrompt: "" };
  }

  const trimmed = userText.trim();
  const explicit = /^\/(?:image|img)\b/i.test(trimmed);

  const ai = getAi();
  if (!ai) {
    const rawClean = trimmed.replace(/^\/(?:image|img)\s*/i, "").trim();
    return {
      isImage: explicit || isImagePrompt(trimmed),
      cleanSubject: rawClean,
      cleanPrompt: rawClean,
      isRealEntity: false,
      expandedPrompt: rawClean,
    };
  }

  try {
    const systemPrompt = `You are an expert NLP & ML Intent Classification Engine for Nebula AI.
Analyze the user's input, even if it contains heavy typos, phonetic spelling, Manglish, Malayalam, or broken English.
Determine:
1. isImage: true if the user wants to see, draw, generate, or create an image/photo/picture/visual. If the user only wants conversation, information, coding, or facts, set false.
2. cleanSubject: the corrected, normalized entity/subject (fix all spelling errors and phonetic typos, e.g. "mhnlal" -> "Mohanlal", "cr" -> "car", "orupadam mammootty" -> "Mammootty", "cypbpunk" -> "cyberpunk").
3. isRealEntity: true if it is a real living celebrity, actor, Indian personality, politician, famous monument, place, or real car model. False if it is imaginary, fictional, or abstract.
4. expandedPrompt: A breathtaking, colorful, highly detailed photorealistic prompt (max 35 words) with rich colors, cinematic lighting, and 8k photorealism.

Output ONLY valid JSON:
{"isImage": boolean, "cleanSubject": string, "isRealEntity": boolean, "expandedPrompt": string}`;

    const res = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: `${systemPrompt}\n\nUser input: "${trimmed}"`,
    });

    const cleanJson = res.text.trim().replace(/^```json|```$/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    const subject = parsed.cleanSubject || trimmed.replace(/^\/(?:image|img)\s*/i, "").trim();
    return {
      isImage: explicit || Boolean(parsed.isImage),
      cleanSubject: subject,
      cleanPrompt: subject,
      isRealEntity: Boolean(parsed.isRealEntity),
      expandedPrompt: parsed.expandedPrompt || subject,
    };
  } catch (err) {
    console.warn("⚠️ ML Intent Classification fallback:", err.message);
    const rawClean = trimmed.replace(/^\/(?:image|img)\s*/i, "").trim();
    return {
      isImage: explicit || isImagePrompt(trimmed),
      cleanSubject: rawClean,
      cleanPrompt: rawClean,
      isRealEntity: false,
      expandedPrompt: rawClean,
    };
  }
}

/**
 * Searches for high-resolution authentic imagery (crucial for real people, places, vehicles)
 */
async function searchHighResVisual(query) {
  try {
    const q = `${query} high resolution`;
    const r1 = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    const t1 = await r1.text();
    const match = t1.match(/vqd=[\x22']?([^&'\x22]+)/);
    if (!match) return null;

    const vqd = match[1];
    const r2 = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    const data = await r2.json();
    if (data.results && data.results.length > 0) {
      for (const item of data.results.slice(0, 10)) {
        if (
          item.image && 
          item.image.startsWith("https://") && 
          !item.image.includes("lookaside.fbsbx.com") &&
          !item.image.includes("ytimg.com")
        ) {
          return { imageUrl: item.image, title: item.title };
        }
      }
    }
  } catch (err) {
    console.warn("⚠️ High-res visual search warning:", err.message);
  }
  return null;
}

/**
 * Executes visual generation / retrieval and uploads permanently to Cloudinary CDN (drxsezyyl)
 */
async function generateAndUploadImage(input, options = {}) {
  let intentData;
  if (typeof input === "string") {
    intentData = await classifyUserIntent(input);
  } else {
    intentData = input || {};
  }

  const cleanSubject = intentData.cleanSubject || intentData.cleanPrompt || "artwork";
  const expandedPrompt = intentData.expandedPrompt || cleanSubject;
  const isRealEntity = Boolean(intentData.isRealEntity);
  const targetWidth = Number(options.width) || 1024;
  const targetHeight = Number(options.height) || 1024;

  let cdnUrl = null;

  // Strategy 1: Real Entities, Celebrities, Actors, Places (e.g. Mohanlal, Mammootty, etc.)
  if (isRealEntity) {
    try {
      const entityResult = await searchHighResVisual(`${cleanSubject} portrait photo`);
      if (entityResult?.imageUrl) {
        cdnUrl = await uploadToCloudinary(entityResult.imageUrl, "nebula_ai/generated");
      }
    } catch (entityErr) {
      console.warn("⚠️ Real entity upload warning:", entityErr.message);
    }
  }

  // Strategy 2: Creative / Imaginary Visuals via AI generation
  if (!cdnUrl) {
    const encodedPrompt = encodeURIComponent(expandedPrompt);
    const seed = Math.floor(Math.random() * 1000000);
    const pollUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${targetWidth}&height=${targetHeight}&model=flux&nologo=true&seed=${seed}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(pollUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "image/*",
        },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("image")) {
          const arrBuf = await res.arrayBuffer();
          if (arrBuf && arrBuf.byteLength > 2000) {
            const dataUri = `data:image/jpeg;base64,${Buffer.from(arrBuf).toString("base64")}`;
            cdnUrl = await uploadToCloudinary(dataUri, "nebula_ai/generated");
          }
        }
      }
    } catch (pollErr) {
      console.warn("⚠️ Pollinations engine warning:", pollErr.message);
    }
  }

  // Strategy 3: Multi-tier fallback to verified visual search on Cloudinary CDN
  if (!cdnUrl) {
    try {
      const visualFallback = await searchHighResVisual(cleanSubject);
      if (visualFallback?.imageUrl) {
        cdnUrl = await uploadToCloudinary(visualFallback.imageUrl, "nebula_ai/generated");
      }
    } catch (fallbackErr) {
      console.warn("⚠️ Visual fallback upload warning:", fallbackErr.message);
    }
  }

  // Strategy 4: Offline-safe custom SVG artwork poster (never returns unrelated random stock photos)
  if (!cdnUrl) {
    const safeTitle = String(cleanSubject || "Nebula Artwork")
      .replace(/[<>&"']/g, "")
      .slice(0, 48);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidth}" height="${targetHeight}" viewBox="0 0 1024 1024">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="50%" stop-color="#311042"/>
          <stop offset="100%" stop-color="#1e1b4b"/>
        </linearGradient>
        <radialGradient id="orb" cx="50%" cy="45%" r="35%">
          <stop offset="0%" stop-color="#a855f7" stop-opacity="0.85"/>
          <stop offset="60%" stop-color="#6366f1" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1024" height="1024" fill="url(#bg)"/>
      <circle cx="512" cy="460" r="340" fill="url(#orb)"/>
      <circle cx="512" cy="460" r="140" fill="none" stroke="#c084fc" stroke-width="2" stroke-opacity="0.4"/>
      <text x="512" y="820" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="36" font-weight="bold">${safeTitle}</text>
      <text x="512" y="868" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="22">Nebula AI Visual Studio • ${targetWidth}x${targetHeight}</text>
    </svg>`;
    const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    cdnUrl = (await uploadToCloudinary(svgDataUri, "nebula_ai/generated")) || svgDataUri;
  }

  return {
    cdnUrl,
    cleanSubject,
    cleanPrompt: cleanSubject,
    expandedPrompt,
    isRealEntity,
  };
}

module.exports = {
  isImagePrompt,
  classifyUserIntent,
  generateAndUploadImage,
  searchHighResVisual,
};
