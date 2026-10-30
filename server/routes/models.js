const express = require("express");
const { AiModel, PromptPreset } = require("../models");

const router = express.Router();

// Default AI model configurations
const DEFAULT_MODELS = [
  {
    modelId: "gemini-3.8-flash",
    displayName: "Nebula 4.0e (Gemini 3.8 Flash)",
    tag: "Fast & Smart",
    badge: "Recommended",
    description: "Google's state-of-the-art multimodal reasoning model with ultra-fast inference and tool handling.",
    provider: "Google Gemini",
    contextWindow: "1M tokens",
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsVoice: true,
    supportsReasoning: true,
    isProOnly: false,
    sortOrder: 1,
  },
  {
    modelId: "gemini-3.5-flash",
    displayName: "Gemini 3.5 Flash",
    tag: "High Speed",
    badge: "Fast",
    description: "Optimized for speed and concise answers, perfect for coding and daily assistant tasks.",
    provider: "Google Gemini",
    contextWindow: "1M tokens",
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsVoice: true,
    supportsReasoning: false,
    isProOnly: false,
    sortOrder: 2,
  },
  {
    modelId: "gemini-3.5-flash-lite",
    displayName: "Gemini 3.5 Flash Lite",
    tag: "Ultralight",
    badge: "Efficient",
    description: "Lightweight and ultra-low latency model engineered for instant chat and quick summaries.",
    provider: "Google Gemini",
    contextWindow: "500K tokens",
    maxOutputTokens: 4096,
    supportsVision: true,
    supportsVoice: true,
    supportsReasoning: false,
    isProOnly: false,
    sortOrder: 3,
  },
  {
    modelId: "gemini-3.5-pro",
    displayName: "Gemini 3.5 Pro",
    tag: "Deep Reasoning",
    badge: "Pro",
    description: "Advanced cognitive reasoning model for architectural design, complex codebases, and academic research.",
    provider: "Google Gemini",
    contextWindow: "2M tokens",
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsVoice: true,
    supportsReasoning: true,
    isProOnly: true,
    sortOrder: 4,
  },
  {
    modelId: "gemini-1.5-flash",
    displayName: "Gemini 1.5 Flash",
    tag: "Stable Workhorse",
    badge: "Stable",
    description: "Proven high-throughput foundation model for massive document and contextual reasoning.",
    provider: "Google Gemini",
    contextWindow: "1M tokens",
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsVoice: true,
    supportsReasoning: false,
    isProOnly: false,
    sortOrder: 5,
  },
];

// Default system presets / personas
const DEFAULT_PRESETS = [
  {
    title: "Senior Full-Stack Architect",
    subtitle: "Clean code, TypeScript, API design & debugging",
    category: "coding",
    systemInstruction: "You are an elite Principal Software Architect. Always write production-grade, cleanly typed code with no placeholders. Explain architecture trade-offs clearly.",
    starterPrompt: "Review and optimize my architecture for high-concurrency microservices",
    icon: "code",
  },
  {
    title: "Malayalam Assistant & Translator",
    subtitle: "മലയാളത്തിൽ സംസാരിക്കാനും സഹായിക്കാനും",
    category: "language",
    systemInstruction: "You are a bilingual AI fluent in Malayalam and English. Respond naturally in Malayalam whenever addressed in Malayalam or requested.",
    starterPrompt: "മലയാളത്തിൽ ആർട്ടിഫിഷ്യൽ ഇന്റലിജൻസ് എങ്ങനെ പ്രവർത്തിക്കുന്നു എന്ന് വിശദീകരിക്കാമോ?",
    icon: "globe",
  },
  {
    title: "Deep Analytical Thinker",
    subtitle: "First-principles reasoning and step-by-step logic",
    category: "reasoning",
    systemInstruction: "You are a deep logical reasoner. Break down every complex problem into first principles, consider edge cases, and present structured arguments.",
    starterPrompt: "Break down the core trade-offs between monolithic and microservice architectures",
    icon: "brainstorm",
  },
  {
    title: "Creative Story & Copy Studio",
    subtitle: "High-impact storytelling, scripts & persuasive copy",
    category: "creative",
    systemInstruction: "You are an imaginative creative director and storyteller. Produce vivid, emotionally resonant, and engaging prose.",
    starterPrompt: "Write a captivating sci-fi opening set in a Dyson Sphere orbital station",
    icon: "sparkles",
  },
];

// Seed defaults into MongoDB if empty
async function seedDefaultsIfNeeded() {
  try {
    const modelCount = await AiModel.countDocuments();
    if (modelCount === 0) {
      await AiModel.insertMany(DEFAULT_MODELS);
      console.log("🌱 Default AI Models seeded into MongoDB");
    }

    const presetCount = await PromptPreset.countDocuments();
    if (presetCount === 0) {
      await PromptPreset.insertMany(DEFAULT_PRESETS);
      console.log("🌱 Default Prompt Presets seeded into MongoDB");
    }
  } catch (err) {
    console.warn("Seeding models/presets warning:", err.message);
  }
}

// GET /api/models - List all active AI models
router.get("/models", async (req, res) => {
  try {
    let models = await AiModel.find({ isActive: true }).sort({ sortOrder: 1 });
    if (!models || models.length === 0) {
      models = DEFAULT_MODELS;
    }
    return res.json({ success: true, models });
  } catch (err) {
    return res.json({ success: true, models: DEFAULT_MODELS });
  }
});

// GET /api/presets - List all public prompt presets
router.get("/presets", async (req, res) => {
  try {
    let presets = await PromptPreset.find({ isPublic: true });
    if (!presets || presets.length === 0) {
      presets = DEFAULT_PRESETS;
    }
    return res.json({ success: true, presets });
  } catch (err) {
    return res.json({ success: true, presets: DEFAULT_PRESETS });
  }
});

module.exports = {
  router,
  seedDefaultsIfNeeded,
  DEFAULT_MODELS,
};

