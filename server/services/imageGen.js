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
  "westend61",
  "superstock",
  "masterfile",
  "dissolve",
  "panthermedia",
  "eyeem",
  "bridgemanimages",
  "sciencephoto",
  "pngtree",
  "cleanpng",
  "rawpixel",
  "envato",
  "stockphoto",
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
 * Extracts and parses the first JSON object found in an LLM response.
 */
function parseJsonObject(rawText = "") {
  const match = String(rawText).match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Style preset art-direction profiles for FLUX / Diffusion studio conditioning.
 */
const STYLE_PRESET_GUIDES = {
  auto: "Match the natural artistic medium implied by the user's request with crisp composition, lifelike textures, and balanced lighting.",
  photorealistic: "Documentary editorial photograph captured on a full-frame 50mm lens, authentic natural textures, realistic skin/material micro-detail, balanced dynamic range, subtle shallow depth of field.",
  cinematic: "Anamorphic widescreen cinema still, atmospheric volumetric depth, motivated key and rim lighting, subtle filmic color grading, dramatic framing.",
  "product-studio": "Commercial studio product photography on clean architectural stone or matte backdrop, crisp softbox specular highlights, precision reflections, zero clutter.",
  architecture: "Architectural Digest editorial photography, straight vertical perspective lines, warm natural sunlight casting crisp shadows across glass, timber, and stone.",
  "concept-art": "High-craft digital concept art painting with rich environmental storytelling, cohesive color palette, crisp silhouette readability, atmospheric perspective.",
  "minimal-illustration": "Clean contemporary editorial illustration with refined geometric forms, harmonious muted palette, crisp negative space, gallery poster feel.",
};

const DEFAULT_NEGATIVE_PROMPT =
  "blurry, out of focus, distorted anatomy, deformed hands, extra fingers, text overlay, watermark, signature, logo, low resolution, jpeg artifacts, oversaturated, plastic artificial skin, cluttered background";

let geminiImageQuotaBlockedUntil = 0;

function getImageEngineStatus() {
  const hasHuggingFace = Boolean(process.env.HF_TOKEN);
  const hasCloudflare = Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID);
  const hasTogether = Boolean(process.env.TOGETHER_API_KEY);
  const hasPollinationsPro = Boolean(process.env.POLLINATIONS_API_KEY);
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  const hasDedicatedFlux = hasHuggingFace || hasCloudflare || hasTogether || hasPollinationsPro;

  const activeEngine = hasHuggingFace
    ? "huggingface-flux"
    : hasCloudflare
      ? "cloudflare-flux"
      : hasTogether
        ? "together-flux"
        : hasPollinationsPro
          ? "pollinations-pro-flux"
          : "pollinations-classic-free";

  return {
    activeEngine,
    hasDedicatedFlux,
    providers: {
      huggingface: hasHuggingFace,
      cloudflare: hasCloudflare,
      together: hasTogether,
      pollinationsPro: hasPollinationsPro,
      geminiImage: hasGeminiKey && Date.now() >= geminiImageQuotaBlockedUntil,
    },
  };
}

/**
 * Removes noisy buzzword clutter while preserving authentic photographic & art-direction descriptors.
 */
function normalizeVisualPrompt(rawText = "") {
  return String(rawText)
    .replace(/\b(8k|4k|uhd|hdr|hyperrealistic|masterpiece|best quality|award[- ]winning|trending on artstation|octane render|unreal engine\s*\d*)\b/gi, "")
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

function toGeminiAspectRatio(width, height) {
  const ratio = (Number(width) || 1024) / (Number(height) || 1024);
  if (ratio > 1.55) return "16:9";
  if (ratio > 1.2) return "4:3";
  if (ratio < 0.65) return "9:16";
  if (ratio < 0.85) return "3:4";
  return "1:1";
}

/**
 * ML Logical Intent Reasoner, Auto-Mistake Detector & Art-Director Prompt Conditioning Engine
 * Fixes spelling mistakes, Manglish/Malayalam, abbreviations, and physical/spatial contradictions
 * while elevating prompts into vivid, studio-grade diffusion descriptions.
 */
async function classifyUserIntent(userText, options = {}) {
  if (!userText || typeof userText !== "string") {
    return {
      isImage: false,
      cleanSubject: "",
      cleanPrompt: "",
      isRealEntity: false,
      expandedPrompt: "",
      negativePrompt: DEFAULT_NEGATIVE_PROMPT,
      didAutoCorrect: false,
      detectedIssues: [],
      reasoningSummary: "",
    };
  }

  const trimmed = userText.trim();
  const explicit = /^\/(?:image|img)\b/i.test(trimmed);
  const rawClean = trimmed.replace(/^\/(?:image|img)\s*/i, "").trim();
  const studioMode = Boolean(options.studioMode);
  const stylePresetKey = STYLE_PRESET_GUIDES[options.stylePreset] ? options.stylePreset : "auto";
  const wordCount = rawClean.split(/\s+/).filter(Boolean).length;

  const fallbackResult = {
    isImage: explicit || studioMode || isImagePrompt(trimmed),
    cleanSubject: rawClean,
    cleanPrompt: rawClean,
    isRealEntity: false,
    expandedPrompt: rawClean,
    negativePrompt: DEFAULT_NEGATIVE_PROMPT,
    didAutoCorrect: false,
    detectedIssues: [],
    reasoningSummary: "",
  };

  const ai = getAi();
  if (!ai) return fallbackResult;

  try {
    const modeRules = studioMode
      ? `1. isImage: always true.
2. cleanSubject: Short core subject label (max 8 words).
3. isRealEntity: true ONLY if the entire input is just a named real celebrity/person (4 words or fewer, with no architectural, product, lighting, or scene instructions). False for all architecture, interiors, landscapes, products, and creative scenes.`
      : `1. isImage: true if the user wants to see, draw, generate, or create an image/photo/picture/visual. False if asking for conversation, facts, coding, or explanations.
2. cleanSubject: Corrected, normalized subject/entity (fixing spelling mistakes and Manglish/phonetic typos).
3. isRealEntity: true if asking for a photo/portrait of a real living celebrity, politician, famous landmark, or real car model WITHOUT bespoke creative scene instructions. False otherwise.`;

    const styleDirective = STYLE_PRESET_GUIDES[stylePresetKey];

    const systemPrompt = `You are a Master Visual Art-Director & Diffusion Prompt Architect for Nebula AI (FLUX.1 / Gemini Image Studio).
Your job is to understand what the user truly wants to see, fix any mistakes automatically, and craft a studio-grade visual prompt that produces crisp, coherent, gallery-quality renders:
- Translate Malayalam/Manglish or broken grammar cleanly into precise English.
- Fix all typos and shorthand abbreviations accurately (e.g., "drinkng cofe" -> "drinking coffee", "lptop" -> "laptop", "ofice" -> "office", "mdy" -> "moody lighting", "bicyle" -> "bicycle", "mhnlal" -> "Mohanlal"). Preserve EVERY intentional mood, color, clothing, or setting detail!
- Resolve logical/physical contradictions naturally unless explicitly surreal (e.g., "drinking coffee on laptop" -> seated at a warm wooden desk holding a ceramic coffee mug beside an open laptop; vague one-word input -> compose a striking, natural foreground subject with rich context and motivated lighting).
- Structure expandedPrompt with 4 clear visual layers: (1) concrete focal subject, posture & surface materials, (2) framing & camera angle (e.g., eye-level medium shot, 50mm/85mm shallow depth of field), (3) specific directional lighting & shadows/reflections, (4) cohesive environment & natural color harmony.
- Style direction to follow: ${styleDirective}
- Avoid empty buzzword soup ("8k", "4k", "uhd", "masterpiece", "octane render", "trending on artstation"). NEVER inject unrequested sci-fi, neon, or fantasy elements unless asked.

${modeRules}
4. didAutoCorrect: boolean — true if you fixed typos, expanded abbreviations/shorthand, translated Malayalam/Manglish, or logically resolved an unclear/contradictory scene.
5. detectedIssues: array of 0 to 3 ultra-short phrases describing what mistake/unclear logic was corrected (empty [] if input was already clear and error-free).
6. reasoningSummary: 1 crisp sentence explaining the coherent visual scene and photographic direction inferred.
7. expandedPrompt: Rich, vivid, unambiguous art-directed visual description (28 to 52 words) optimized for FLUX/Diffusion: exact visible subject, materials, camera framing, directional lighting, atmosphere, and background depth.
8. negativePrompt: 6 to 12 comma-separated defect terms to avoid specifically for this scene (e.g., blurry, extra fingers, text overlay, watermark, distorted reflections).

Output ONLY valid JSON matching this schema:
{"isImage": boolean, "cleanSubject": string, "isRealEntity": boolean, "didAutoCorrect": boolean, "detectedIssues": string[], "reasoningSummary": string, "expandedPrompt": string, "negativePrompt": string}`;

    const res = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: `${systemPrompt}\n\nUser input: "${trimmed}"`,
    });

    const parsed = parseJsonObject(res.text);
    if (!parsed) return fallbackResult;

    const subject = (parsed.cleanSubject || rawClean).trim();
    const groundedExpanded = normalizeVisualPrompt(parsed.expandedPrompt || rawClean) || rawClean;
    const issuesList = Array.isArray(parsed.detectedIssues)
      ? parsed.detectedIssues.filter((x) => typeof x === "string" && x.trim()).slice(0, 3)
      : [];
    const customNeg =
      typeof parsed.negativePrompt === "string" && parsed.negativePrompt.trim()
        ? `${parsed.negativePrompt.trim()}, watermark, text overlay, logo`
        : DEFAULT_NEGATIVE_PROMPT;

    return {
      isImage: explicit || studioMode || Boolean(parsed.isImage),
      cleanSubject: subject,
      cleanPrompt: subject,
      isRealEntity: studioMode && wordCount >= 5 ? false : Boolean(parsed.isRealEntity),
      expandedPrompt: groundedExpanded,
      negativePrompt: customNeg,
      didAutoCorrect: Boolean(parsed.didAutoCorrect || issuesList.length > 0),
      detectedIssues: issuesList,
      reasoningSummary: typeof parsed.reasoningSummary === "string" ? parsed.reasoningSummary.trim() : "",
    };
  } catch (err) {
    console.warn("⚠️ ML Intent Classification fallback:", err.message);
    return fallbackResult;
  }
}

/**
 * Uses Gemini Vision multimodal inspection to verify a rendered image matches the intended prompt
 * and catches corrupted error banners, ghost limbs, or off-subject hallucinations.
 */
async function inspectGeneratedImage(imgBuffer, mimeType, targetPrompt, cleanSubject) {
  const ai = getAi();
  if (!ai || !imgBuffer) {
    return {
      checked: false,
      isErrorOrCorrupted: false,
      matchesPrompt: true,
      qualityScore: null,
      issues: "",
      refinedPrompt: "",
    };
  }

  try {
    const resp = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: imgBuffer.toString("base64"),
          },
        },
        `Inspect this generated image strictly against the intended user subject ("${cleanSubject}") and scene ("${targetPrompt}").
Return ONLY valid JSON:
{
  "isErrorOrCorrupted": boolean,
  "matchesPrompt": boolean,
  "qualityScore": integer 1 to 10,
  "issues": "short summary of distortion, error text, watermark banner, or mismatch, or 'none'",
  "refinedPrompt": "if qualityScore < 6 or matchesPrompt is false, write a simpler clearer 12-18 word visual prompt that avoids this failure; otherwise empty string"
}`,
      ],
    });

    const parsed = parseJsonObject(resp.text);
    if (!parsed) {
      return {
        checked: false,
        isErrorOrCorrupted: false,
        matchesPrompt: true,
        qualityScore: null,
        issues: "",
        refinedPrompt: "",
      };
    }

    return {
      checked: true,
      isErrorOrCorrupted: Boolean(parsed.isErrorOrCorrupted),
      matchesPrompt: parsed.matchesPrompt !== false,
      qualityScore: typeof parsed.qualityScore === "number" ? parsed.qualityScore : 7,
      issues: typeof parsed.issues === "string" ? parsed.issues.trim() : "",
      refinedPrompt: typeof parsed.refinedPrompt === "string" ? normalizeVisualPrompt(parsed.refinedPrompt) : "",
    };
  } catch (err) {
    console.warn("⚠️ Visual quality check skipped:", err.message);
    return {
      checked: false,
      isErrorOrCorrupted: false,
      matchesPrompt: true,
      qualityScore: null,
      issues: "",
      refinedPrompt: "",
    };
  }
}

/**
 * Generates raw image bytes via the best configured official diffusion / native image backend:
 * 1) Hugging Face Official Inference Router — FLUX.1-dev / FLUX.1-schnell (HF_TOKEN, watermark-free)
 * 2) Cloudflare Workers AI — @cf/black-forest-labs/flux-1-schnell (CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID)
 * 3) Together AI — FLUX.1-schnell / FLUX.1.1-pro (TOGETHER_API_KEY)
 * 4) Google Native Gemini Image Generation — gemini-3.1-flash-image / gemini-2.5-flash-image (GEMINI_API_KEY, cached 429 cooldown)
 * 5) Pollinations Pro Authenticated Gateway — gen.pollinations.ai FLUX / Z-Image (POLLINATIONS_API_KEY)
 * 6) Pollinations Classic Free Public Fallback — image.pollinations.ai with enhance=true + clean 503 backoff
 */
async function renderImageBuffer(prompt, options = {}) {
  const width = Math.min(Math.max(Number(options.width) || 1024, 512), 1536);
  const height = Math.min(Math.max(Number(options.height) || 1024, 512), 1536);
  const steps = Math.min(Math.max(Number(options.steps) || 4, 1), 32);
  const cfg = Math.min(Math.max(Number(options.cfg) || 3.5, 1), 10);
  const unetModel = String(options.unetModel || options.model || "");
  const negativePrompt = String(options.negativePrompt || DEFAULT_NEGATIVE_PROMPT);
  const seed = Number.isInteger(options.seed) ? options.seed : Math.floor(Math.random() * 1000000);
  const isDevQuality = /dev|pro|ultra|hq/i.test(unetModel);

  // Tier 1: Official Black Forest Labs FLUX.1 via Hugging Face Inference Router (Zero Watermark)
  if (process.env.HF_TOKEN) {
    const hfModel = isDevQuality
      ? "black-forest-labs/FLUX.1-dev"
      : "black-forest-labs/FLUX.1-schnell";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 32000);
    try {
      const res = await fetch(`https://router.huggingface.co/hf-inference/models/${hfModel}`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "image/jpeg",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            width,
            height,
            num_inference_steps: isDevQuality ? Math.max(steps, 22) : Math.min(Math.max(steps, 4), 8),
            guidance_scale: isDevQuality ? Math.max(cfg, 3.5) : cfg,
            ...(isDevQuality ? { negative_prompt: negativePrompt } : {}),
          },
        }),
      });
      clearTimeout(timer);

      if (res.ok) {
        const ct = res.headers.get("content-type") || "image/jpeg";
        if (ct.includes("image")) {
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length > 5000) {
            return { buffer: buf, mimeType: ct.split(";")[0], source: "huggingface-flux", rateLimited: false };
          }
        }
      } else if (res.status === 429) {
        console.warn("⚠️ Hugging Face rate limit reached, falling back cleanly.");
      }
    } catch (hfErr) {
      clearTimeout(timer);
      console.warn("⚠️ Hugging Face FLUX warning:", hfErr.message);
    }
  }

  // Tier 2: Cloudflare Workers AI Official FLUX.1-schnell (Free daily tier, Zero Watermark)
  if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
    const cfSteps = Math.min(Math.max(steps, 4), 8);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 28000);
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt, steps: cfSteps }),
        }
      );
      clearTimeout(timer);
      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const payload = await res.json();
          const b64 = payload?.result?.image;
          if (b64) {
            const buf = Buffer.from(b64, "base64");
            if (buf.length > 5000) {
              return { buffer: buf, mimeType: "image/jpeg", source: "cloudflare-flux", rateLimited: false };
            }
          }
        } else if (ct.includes("image")) {
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length > 5000) {
            return { buffer: buf, mimeType: ct.split(";")[0], source: "cloudflare-flux", rateLimited: false };
          }
        }
      }
    } catch (cfErr) {
      clearTimeout(timer);
      console.warn("⚠️ Cloudflare FLUX warning:", cfErr.message);
    }
  }

  // Tier 3: Together AI Official FLUX.1 Router (Zero Watermark)
  if (process.env.TOGETHER_API_KEY) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 28000);
    try {
      const res = await fetch("https://api.together.xyz/v1/images/generations", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: isDevQuality ? "black-forest-labs/FLUX.1-dev" : "black-forest-labs/FLUX.1-schnell-Free",
          prompt,
          width,
          height,
          steps: isDevQuality ? Math.max(steps, 20) : Math.min(Math.max(steps, 4), 4),
          n: 1,
          response_format: "b64_json",
        }),
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const b64 = data?.data?.[0]?.b64_json;
        if (b64) {
          const buf = Buffer.from(b64, "base64");
          if (buf.length > 5000) {
            return { buffer: buf, mimeType: "image/png", source: "together-flux", rateLimited: false };
          }
        }
      }
    } catch (tgErr) {
      clearTimeout(timer);
      console.warn("⚠️ Together FLUX warning:", tgErr.message);
    }
  }

  // Tier 4: Google Native Gemini Image Generation (activates automatically when GEMINI_API_KEY has image quota)
  const ai = getAi();
  if (ai && Date.now() >= geminiImageQuotaBlockedUntil) {
    const geminiImageModels = isDevQuality
      ? ["gemini-3-pro-image", "gemini-3.1-flash-image", "gemini-2.5-flash-image"]
      : ["gemini-3.1-flash-image", "gemini-2.5-flash-image"];
    const aspectRatio = toGeminiAspectRatio(width, height);
    for (const model of geminiImageModels) {
      try {
        const resp = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseModalities: ["IMAGE"],
            imageConfig: { aspectRatio },
          },
        });
        const parts = resp?.candidates?.[0]?.content?.parts || [];
        const imgPart = parts.find((p) => p?.inlineData?.data);
        if (imgPart) {
          const buf = Buffer.from(imgPart.inlineData.data, "base64");
          if (buf.length > 5000) {
            return {
              buffer: buf,
              mimeType: imgPart.inlineData.mimeType || "image/png",
              source: "gemini-native-image",
              rateLimited: false,
            };
          }
        }
      } catch (gemErr) {
        const msg = String(gemErr?.message || "");
        if (msg.includes("429") || /quota|rate/i.test(msg)) {
          // Cache free-tier 429 cooldown for 15 minutes so subsequent renders have 0ms overhead
          geminiImageQuotaBlockedUntil = Date.now() + 15 * 60 * 1000;
          break;
        }
        console.warn(`⚠️ Gemini Native Image (${model}) warning:`, msg.slice(0, 140));
      }
    }
  }

  // Tier 5: Pollinations Pro Authenticated Gateway (gen.pollinations.ai — Real FLUX / Z-Image, Zero Watermark)
  const encodedPrompt = encodeURIComponent(prompt);
  if (process.env.POLLINATIONS_API_KEY) {
    const proModel = isDevQuality ? "flux" : "zimage";
    const pollProUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?width=${width}&height=${height}&model=${proModel}&nologo=true&enhance=true&seed=${seed}&negative_prompt=${encodeURIComponent(negativePrompt)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 28000);
    try {
      const res = await fetch(pollProUrl, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${process.env.POLLINATIONS_API_KEY}`,
          Accept: "image/*",
        },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("image")) {
          const arrBuf = await res.arrayBuffer();
          if (arrBuf && arrBuf.byteLength > 5000) {
            return {
              buffer: Buffer.from(arrBuf),
              mimeType: ct.split(";")[0],
              source: "pollinations-pro-flux",
              rateLimited: false,
            };
          }
        }
      }
    } catch (proErr) {
      clearTimeout(timeoutId);
      console.warn("⚠️ Pollinations Pro warning:", proErr.message);
    }
  }

  // Tier 6: Free Classic Public Fallback (enhance=true for higher fidelity + single clean backoff retry on 503)
  const classicUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=flux&nologo=true&enhance=true&seed=${seed}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 22000);
    try {
      const res = await fetch(classicUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "image/*",
        },
      });
      clearTimeout(timeoutId);

      if (res.status === 402 || res.status === 429) {
        return { buffer: null, mimeType: "", source: "pollinations-classic-free", rateLimited: true };
      }
      if (res.status === 503 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("image")) {
          const arrBuf = await res.arrayBuffer();
          if (arrBuf && arrBuf.byteLength > 5000) {
            return {
              buffer: Buffer.from(arrBuf),
              mimeType: ct.split(";")[0],
              source: "pollinations-classic-free",
              rateLimited: false,
            };
          }
        }
      }
      break;
    } catch (pollErr) {
      clearTimeout(timeoutId);
      console.warn("⚠️ Pollinations classic fallback warning:", pollErr.message);
      break;
    }
  }

  return { buffer: null, mimeType: "", source: "pollinations-classic-free", rateLimited: false };
}

/**
 * Searches for high-resolution authentic imagery, filtering out stock watermarks & weird AI wallpaper slop.
 */
async function searchHighResCandidates(query) {
  try {
    const q = `${query} high resolution -gettyimages -shutterstock -alamy -istockphoto -dreamstime -123rf -freepik -pinterest -westend61 -vecteezy -pngtree`;
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

async function uploadFirstCandidate(candidates, folder = "nebula_ai/generated", targetPrompt = "", cleanSubject = "") {
  for (const cand of (candidates || []).slice(0, 5)) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6500);
      const r = await fetch(cand.imageUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0", Accept: "image/*" },
      });
      clearTimeout(timer);
      if (!r.ok) continue;
      const ct = (r.headers.get("content-type") || "").split(";")[0];
      if (!ct.includes("image")) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 8000 || buf.length > 10 * 1024 * 1024) continue;

      let check = null;
      if (targetPrompt) {
        check = await inspectGeneratedImage(buf, ct, targetPrompt, cleanSubject || targetPrompt);
        const watermarkFlag = /watermark|stock\s*logo|shutterstock|alamy|getty|westend/i.test(check.issues || "");
        if (check.isErrorOrCorrupted || watermarkFlag || (!check.matchesPrompt && (check.qualityScore || 0) <= 4)) {
          continue;
        }
      }

      const dataUri = `data:${ct};base64,${buf.toString("base64")}`;
      const uploaded = await uploadToCloudinary(dataUri, folder);
      if (uploaded) return { cdnUrl: uploaded, check };
    } catch {
      continue;
    }
  }
  return null;
}

function toQualityCheckSummary(check, retried = false) {
  if (!check || !check.checked) {
    return { checked: false, matchesPrompt: true, score: null, issues: "", retried };
  }
  return {
    checked: true,
    matchesPrompt: check.matchesPrompt,
    score: check.qualityScore,
    issues: check.issues === "none" ? "" : check.issues || "",
    retried,
  };
}

/**
 * Executes visual generation, inspects output with Gemini Vision, retries once if distorted/off-prompt,
 * and uploads permanently to Cloudinary CDN.
 */
async function generateAndUploadImage(input, options = {}) {
  const studioMode = Boolean(options.studioMode);
  const stylePreset = options.stylePreset || "auto";
  let intentData;
  if (typeof input === "string") {
    intentData = await classifyUserIntent(input, { studioMode, stylePreset });
  } else {
    intentData = input || {};
  }

  const cleanSubject = intentData.cleanSubject || intentData.cleanPrompt || "artwork";
  let expandedPrompt = intentData.expandedPrompt || cleanSubject;
  const negativePrompt = options.negativePrompt || intentData.negativePrompt || DEFAULT_NEGATIVE_PROMPT;
  const isRealEntity = Boolean(intentData.isRealEntity);
  const didAutoCorrect = Boolean(intentData.didAutoCorrect);
  const detectedIssues = Array.isArray(intentData.detectedIssues) ? intentData.detectedIssues : [];
  const reasoningSummary = intentData.reasoningSummary || "";
  const targetWidth = Number(options.width) || 1024;
  const targetHeight = Number(options.height) || 1024;
  const engineStatus = getImageEngineStatus();

  let cdnUrl = null;
  let generationSource = "offline-svg-card";
  let qualityCheck = toQualityCheckSummary(null, false);

  // Strategy 1: Authentic portraits / real celebrities when requested directly
  if (isRealEntity) {
    try {
      const entityCandidates = await searchHighResCandidates(`${cleanSubject} portrait photo`);
      const picked = await uploadFirstCandidate(entityCandidates, "nebula_ai/generated", expandedPrompt, cleanSubject);
      if (picked?.cdnUrl) {
        cdnUrl = picked.cdnUrl;
        generationSource = "real-entity-photo";
        qualityCheck = toQualityCheckSummary(picked.check, false);
      }
    } catch (entityErr) {
      console.warn("⚠️ Real entity upload warning:", entityErr.message);
    }
  }

  // Strategy 2: Generative AI Visual Pipeline + Gemini Vision Self-Check & Auto-Retry
  if (!cdnUrl) {
    const renderOpts = { ...options, negativePrompt };
    const attempt1 = await renderImageBuffer(expandedPrompt, renderOpts);
    let chosenRender = attempt1;
    let chosenCheck = null;

    if (attempt1.buffer) {
      chosenCheck = await inspectGeneratedImage(
        attempt1.buffer,
        attempt1.mimeType,
        expandedPrompt,
        cleanSubject
      );

      const retryThreshold = engineStatus.hasDedicatedFlux ? 7 : 6;
      const needsRetry =
        chosenCheck.isErrorOrCorrupted ||
        !chosenCheck.matchesPrompt ||
        (typeof chosenCheck.qualityScore === "number" && chosenCheck.qualityScore < retryThreshold);

      // Avoid double-hitting the 45s IP rate limit on the classic free fallback unless image is actually broken
      const shouldRetry =
        needsRetry &&
        (engineStatus.hasDedicatedFlux ||
          (!attempt1.rateLimited && chosenRender.source !== "pollinations-classic-free"));

      if (shouldRetry) {
        const retryPrompt = chosenCheck.refinedPrompt || `${cleanSubject}, editorial photography, natural lighting, crisp detail`;
        const attempt2 = await renderImageBuffer(retryPrompt, {
          ...renderOpts,
          seed: Math.floor(Math.random() * 1000000),
        });

        if (attempt2.buffer) {
          const check2 = await inspectGeneratedImage(
            attempt2.buffer,
            attempt2.mimeType,
            retryPrompt,
            cleanSubject
          );
          const score1 = chosenCheck.isErrorOrCorrupted ? 0 : chosenCheck.qualityScore || 5;
          const score2 = check2.isErrorOrCorrupted ? 0 : check2.qualityScore || 5;
          if (!check2.isErrorOrCorrupted && (score2 >= score1 || !chosenCheck.matchesPrompt)) {
            chosenRender = attempt2;
            chosenCheck = check2;
            expandedPrompt = retryPrompt;
          }
          qualityCheck.retried = true;
        }
      }

      const rejected =
        chosenCheck.isErrorOrCorrupted ||
        (!chosenCheck.matchesPrompt &&
          typeof chosenCheck.qualityScore === "number" &&
          chosenCheck.qualityScore <= 4);

      if (!rejected && chosenRender.buffer) {
        const b64Mime = chosenRender.mimeType || "image/jpeg";
        const dataUri = `data:${b64Mime};base64,${chosenRender.buffer.toString("base64")}`;
        cdnUrl = await uploadToCloudinary(dataUri, "nebula_ai/generated");
        if (cdnUrl) {
          generationSource = chosenRender.source;
          qualityCheck = toQualityCheckSummary(chosenCheck, qualityCheck.retried);
        }
      }
    }
  }

  // Strategy 3: Grounded high-resolution photography fallback if generator fails verification or rate-limits
  if (!cdnUrl) {
    try {
      const photoQuery = isRealEntity ? cleanSubject : toCleanPhotoQuery(cleanSubject);
      const fallbackCandidates = await searchHighResCandidates(photoQuery);
      const picked = await uploadFirstCandidate(fallbackCandidates, "nebula_ai/generated", expandedPrompt, cleanSubject);
      if (picked?.cdnUrl) {
        cdnUrl = picked.cdnUrl;
        generationSource = "curated-fallback-photo";
        qualityCheck = toQualityCheckSummary(picked.check, false);
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
    generationSource = "offline-svg-card";
  }

  return {
    cdnUrl,
    cleanSubject,
    cleanPrompt: cleanSubject,
    expandedPrompt,
    negativePrompt,
    isRealEntity,
    didAutoCorrect,
    detectedIssues,
    reasoningSummary,
    generationSource,
    hasDedicatedFlux: engineStatus.hasDedicatedFlux,
    qualityCheck,
  };
}

module.exports = {
  isImagePrompt,
  classifyUserIntent,
  generateAndUploadImage,
  searchHighResVisual,
  getImageEngineStatus,
};
