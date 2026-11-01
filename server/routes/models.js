const express = require("express");
const { AiModel, PromptPreset } = require("../models");
const { checkOllamaStatus } = require("../services/ollama");

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

// GET /api/models/ollama/status - Check if Ollama daemon is active
router.get("/models/ollama/status", async (req, res) => {
  const status = await checkOllamaStatus();
  return res.json({ success: true, ...status });
});

// GET /api/models - List all active AI models including auto-detected local Ollama models
router.get("/models", async (req, res) => {
  try {
    let models = await AiModel.find({ isActive: true }).sort({ sortOrder: 1 });
    if (!models || models.length === 0) {
      models = [...DEFAULT_MODELS];
    } else {
      models = models.map(m => (typeof m.toObject === "function" ? m.toObject() : m));
    }

    // Auto-detect local Ollama models dynamically
    const ollamaStatus = await checkOllamaStatus();
    if (ollamaStatus.isRunning && ollamaStatus.models.length > 0) {
      for (const om of ollamaStatus.models) {
        const sizeGB = om.size ? ` (${(om.size / (1024 * 1024 * 1024)).toFixed(1)} GB)` : "";
        models.push({
          modelId: `ollama:${om.name}`,
          displayName: `Ollama (${om.name})`,
          tag: `Local Offline GPU/CPU${sizeGB}`,
          badge: "Local AI",
          description: `Locally running open-weights model ${om.name} on your hardware without internet.`,
          provider: "Ollama Local",
          supportsVision: om.name.toLowerCase().includes("llava") || om.name.toLowerCase().includes("vision"),
          supportsReasoning: om.name.toLowerCase().includes("r1") || om.name.toLowerCase().includes("reasoning"),
          isLocal: true,
          isOnline: true,
        });
      }
    } else {
      // Add Hybrid Ollama (Llama 3) model entry that works both via Localhost Daemon and Cloud Hybrid Fallback
      models.push({
        modelId: "ollama:llama3",
        displayName: "Ollama (Llama 3.3 70B)",
        tag: ollamaStatus.isRunning ? "Local GPU/CPU Active" : "Open-Weights Hybrid • Ready",
        badge: "Local AI",
        description: "Run Meta Llama 3 open-weights intelligence via Ollama Local or Nebula Hybrid Cloud.",
        provider: "Ollama",
        supportsVision: true,
        supportsReasoning: true,
        isLocal: true,
        isOnline: true,
      });
    }

    return res.json({ success: true, models, ollamaActive: ollamaStatus.isRunning });
  } catch (err) {
    return res.json({ success: true, models: DEFAULT_MODELS, ollamaActive: false });
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
