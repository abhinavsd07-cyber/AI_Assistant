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

const BLOCKED_DOMAINS = [
  "lookaside.fbsbx.com",
  "ytimg.com",
  "gettyimages",
  "shutterstock",
  "alamy",
  "istockphoto",
  "123rf",
  "dreamstime",
  "depositphotos",
  "vecteezy",
  "agefotostock",
  "pond5",
  "corbis",
  "bigstockphoto",
  "canstockphoto",
  "megapixl",
  "watermark",
  "deviantart",
  "artstation",
  "lexica.art",
  "civitai",
  "prompthero",
  "nightcafe",
  "stockcake",
  "freepik",
  "pinterest",
  "pinimg.com",
  "wallpapercave",
  "wallpaperflare",
  "zedge",
  "tenor",
  "giphy",
];

/**
 * Strips diffusion/camera jargon from a studio prompt so fallback search stays anchored on real subjects.
 */
function toCleanPhotoQuery(rawText = "") {
  const cleaned = String(rawText)
    .replace(/\b(8k|4k|uhd|hdr|photorealistic|hyperrealistic|ultra-detailed|octane render|unreal engine\s*\d*|volumetric\s*\w*|studio softbox|key light|rim highlights?|f\/\d+(?:\.\d+)?|85mm|35mm|50mm|prime lens|shallow depth of field|creamy natural bokeh|bokeh|kodak portra\s*\d*|analog film|color grading|micro-contrast|balanced negative space|symmetrical framing|clean minimalist composition)\b/gi, " ")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter(Boolean).slice(0, 8);
  return words.length > 0 ? `${words.join(" ")} photography` : "modern architecture photography";
}

/**
 * ML Zero-Shot Semantic Intent Classifier & Prompt Grounding Normalizer
 * Understands typos, Manglish, and Malayalam without injecting unrequested sci-fi/cosmic elements.
 */
async function classifyUserIntent(userText, options = {}) {
  if (!userText || typeof userText !== "string") {
    return { isImage: false, cleanSubject: "", cleanPrompt: "", isRealEntity: false, expandedPrompt: "" };
  }

  const trimmed = userText.trim();
  const explicit = /^\/(?:image|img)\b/i.test(trimmed);
  const rawClean = trimmed.replace(/^\/(?:image|img)\s*/i, "").trim();
  const studioMode = Boolean(options.studioMode);
  const wordCount = rawClean.split(/\s+/).filter(Boolean).length;

  const ai = getAi();
  if (!ai) {
    return {
      isImage: explicit || studioMode || isImagePrompt(trimmed),
      cleanSubject: rawClean,
      cleanPrompt: rawClean,
      isRealEntity: false,
      expandedPrompt: rawClean,
    };
  }

  try {
    const systemPrompt = studioMode
      ? `You are a Visual Prompt Conditioner for Nebula FLUX.1 Studio.
Translate or normalize the user's input cleanly into a crisp, concrete visual prompt (fixing typos, Manglish, or Malayalam if present):
1. isImage: always true.
2. cleanSubject: Short core subject name (max 8 words).
3. isRealEntity: true ONLY if the entire input is just a named real celebrity/person (4 words or fewer, with no architectural, product, lighting, or scene instructions). False for all architecture, interiors, landscapes, products, and creative scenes.
4. expandedPrompt: Rewrite into a clear, literal, concise visual description (10 to 20 words max) naming exact visible objects, materials, lighting, and setting. Strip vague hype buzzwords ("8k", "masterpiece", "micro-contrast", "true-to-life"). NEVER inject sci-fi, cosmic, neon, glowing, or surreal fantasy elements unless explicitly asked.

Output ONLY valid JSON:
{"isImage": boolean, "cleanSubject": string, "isRealEntity": boolean, "expandedPrompt": string}`
      : `You are an expert NLP & ML Intent Classification Engine for Nebula AI.
Analyze the user's input, even if it contains heavy typos, phonetic spelling, Manglish, Malayalam, or broken English.
Determine:
1. isImage: true if the user wants to see, draw, generate, or create an image/photo/picture/visual. If the user only wants conversation, information, coding, or facts, set false.
2. cleanSubject: the corrected, normalized entity/subject (fix all spelling errors and phonetic typos, e.g. "mhnlal" -> "Mohanlal", "cr" -> "car", "orupadam mammootty" -> "Mammootty").
3. isRealEntity: true if it is a real living celebrity, actor, Indian personality, politician, famous monument, place, or real car model WITHOUT artistic scene rewrites. False otherwise.
4. expandedPrompt: A crisp, clear, faithful visual description (10 to 20 words max) preserving the user's exact subject, materials, and natural lighting. Strip vague hype buzzwords ("8k", "breathtaking", "colorful"). NEVER inject unrequested sci-fi, neon, cosmic, glowing, or surreal elements.

Output ONLY valid JSON:
{"isImage": boolean, "cleanSubject": string, "isRealEntity": boolean, "expandedPrompt": string}`;

    const res = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: `${systemPrompt}\n\nUser input: "${trimmed}"`,
    });

    const cleanJson = res.text.trim().replace(/^```json|```$/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    const subject = parsed.cleanSubject || rawClean;
    const groundedExpanded = (parsed.expandedPrompt || rawClean)
      .replace(/\b(8k|4k|uhd|hdr|hyperrealistic|octane render|unreal engine)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    return {
      isImage: explicit || studioMode || Boolean(parsed.isImage),
      cleanSubject: subject,
      cleanPrompt: subject,
      isRealEntity: studioMode && wordCount >= 5 ? false : Boolean(parsed.isRealEntity),
      expandedPrompt: groundedExpanded,
    };
  } catch (err) {
    console.warn("⚠️ ML Intent Classification fallback:", err.message);
    return {
      isImage: explicit || studioMode || isImagePrompt(trimmed),
      cleanSubject: rawClean,
      cleanPrompt: rawClean,
      isRealEntity: false,
      expandedPrompt: rawClean,
    };
  }
}

/**
 * Searches for high-resolution authentic imagery, filtering out stock watermarks & weird AI wallpaper slop.
 */
async function searchHighResCandidates(query) {
  try {
    const q = `${query} high resolution -gettyimages -shutterstock -alamy -istockphoto -dreamstime -123rf -freepik -pinterest`;
    const r1 = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(q)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    const t1 = await r1.text();
    const match = t1.match(/vqd=[\x22']?([^&'\x22]+)/);
    if (!match) return [];

    const vqd = match[1];
    const r2 = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    const data = await r2.json();
    if (data.results && data.results.length > 0) {
      const clean = [];
      for (const item of data.results.slice(0, 30)) {
        const imgLower = (item.image || "").toLowerCase();
        const urlLower = (item.url || "").toLowerCase();
        const titleLower = (item.title || "").toLowerCase();
        const isBlocked = BLOCKED_DOMAINS.some(
          (d) => imgLower.includes(d) || urlLower.includes(d) || titleLower.includes(d)
        );
        const goodResolution = (!item.width || item.width >= 600) && (!item.height || item.height >= 400);
        if (
          item.image &&
          item.image.startsWith("https://") &&
          !isBlocked &&
          goodResolution
        ) {
          const isTrustedHost = /(unsplash\.com|pexels\.com|wikimedia\.org|wikipedia\.org)/i.test(imgLower);
          clean.push({ imageUrl: item.image, title: item.title, priority: isTrustedHost ? 0 : 1 });
        }
      }
      clean.sort((a, b) => a.priority - b.priority);
      return clean;
    }
  } catch (err) {
    console.warn("⚠️ High-res visual search warning:", err.message);
  }
  return [];
}

async function searchHighResVisual(query) {
  const list = await searchHighResCandidates(query);
  return list.length > 0 ? { imageUrl: list[0].imageUrl, title: list[0].title } : null;
}

async function uploadFirstCandidate(candidates, folder = "nebula_ai/generated") {
  for (const cand of (candidates || []).slice(0, 4)) {
    const uploaded = await uploadToCloudinary(cand.imageUrl, folder);
    if (uploaded) return uploaded;
  }
  return null;
}

/**
 * Executes visual generation / retrieval and uploads permanently to Cloudinary CDN (drxsezyyl)
 */
async function generateAndUploadImage(input, options = {}) {
  const studioMode = Boolean(options.studioMode);
  let intentData;
  if (typeof input === "string") {
    intentData = await classifyUserIntent(input, { studioMode });
  } else {
    intentData = input || {};
  }

  const cleanSubject = intentData.cleanSubject || intentData.cleanPrompt || "artwork";
  const expandedPrompt = intentData.expandedPrompt || cleanSubject;
  const isRealEntity = Boolean(intentData.isRealEntity);
  const targetWidth = Number(options.width) || 1024;
  const targetHeight = Number(options.height) || 1024;

  let cdnUrl = null;

  // Strategy 1: Authentic portraits / real celebrities when requested directly
  if (isRealEntity) {
    try {
      const entityCandidates = await searchHighResCandidates(`${cleanSubject} portrait photo`);
      cdnUrl = await uploadFirstCandidate(entityCandidates, "nebula_ai/generated");
    } catch (entityErr) {
      console.warn("⚠️ Real entity upload warning:", entityErr.message);
    }
  }

  // Strategy 2: Generative Visual Pipeline (enhance=false preserves exact prompt without cosmic drift)
  if (!cdnUrl) {
    const encodedPrompt = encodeURIComponent(expandedPrompt);
    const seed = Math.floor(Math.random() * 1000000);
    const pollUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${targetWidth}&height=${targetHeight}&model=flux&nologo=true&enhance=false&seed=${seed}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 24000);
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "image/*",
      };
      if (process.env.POLLINATIONS_API_KEY) {
        headers.Authorization = `Bearer ${process.env.POLLINATIONS_API_KEY}`;
      }

      const res = await fetch(pollUrl, {
        signal: controller.signal,
        headers,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("image")) {
          const arrBuf = await res.arrayBuffer();
          if (arrBuf && arrBuf.byteLength > 5000) {
            const dataUri = `data:image/jpeg;base64,${Buffer.from(arrBuf).toString("base64")}`;
            cdnUrl = await uploadToCloudinary(dataUri, "nebula_ai/generated");
          }
        }
      }
    } catch (pollErr) {
      console.warn("⚠️ Pollinations engine warning:", pollErr.message);
    }
  }

  // Strategy 3: Grounded high-resolution photography fallback if generator rate-limits (HTTP 402) or times out
  if (!cdnUrl) {
    try {
      const photoQuery = isRealEntity ? cleanSubject : toCleanPhotoQuery(cleanSubject);
      const fallbackCandidates = await searchHighResCandidates(photoQuery);
      cdnUrl = await uploadFirstCandidate(fallbackCandidates, "nebula_ai/generated");
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
          <stop offset="0%" stop-color="#09090b"/>
          <stop offset="50%" stop-color="#18181b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
        <radialGradient id="orb" cx="50%" cy="45%" r="35%">
          <stop offset="0%" stop-color="#e2e8f0" stop-opacity="0.35"/>
          <stop offset="60%" stop-color="#64748b" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#09090b" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1024" height="1024" fill="url(#bg)"/>
      <circle cx="512" cy="460" r="340" fill="url(#orb)"/>
      <circle cx="512" cy="460" r="140" fill="none" stroke="#94a3b8" stroke-width="2" stroke-opacity="0.35"/>
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
