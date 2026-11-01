const express = require("express");
const { AiModel, PromptPreset } = require("../models");

const router = express.Router();

// Default AI model configurations prioritized by lowest latency
const DEFAULT_MODELS = [
  {
    modelId: "gemini-3.5-flash-lite",
    displayName: "Nebula 4.0e (Instant Lite)",
    tag: "Ultralight Latency (<1s)",
    badge: "Default",
    description: "Google's ultra-responsive multimodal intelligence engine with lightning-fast sub-second latency.",
    provider: "Google Gemini",
    contextWindow: "500K tokens",
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsVoice: true,
    supportsReasoning: false,
    isProOnly: false,
    sortOrder: 1,
  },
  {
    modelId: "gemini-3.5-flash",
    displayName: "Gemini 3.5 Flash",
    tag: "Balanced Speed & Depth",
    badge: "Balanced",
    description: "High-performance multimodal model with balanced speed and reasoning.",
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
    modelId: "gemini-3.8-flash",
    displayName: "Gemini 3.8 Flash (Deep Thinking)",
    tag: "Reasoning Preview",
    badge: "Thinking",
    description: "Deep thinking preview model with extensive step-by-step reasoning tokens.",
    provider: "Google Gemini",
    contextWindow: "1M tokens",
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsVoice: true,
    supportsReasoning: true,
    isProOnly: false,
    sortOrder: 3,
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
