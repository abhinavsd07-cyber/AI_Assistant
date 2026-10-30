const mongoose = require("mongoose");

const AiModelSchema = new mongoose.Schema(
  {
    modelId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    tag: {
      type: String,
      default: "Fast & Smart",
    },
    badge: {
      type: String,
      default: "Standard",
    },
    description: {
      type: String,
      default: "",
    },
    provider: {
      type: String,
      default: "Google Gemini",
    },
    contextWindow: {
      type: String,
      default: "1M tokens",
    },
    maxOutputTokens: {
      type: Number,
      default: 8192,
    },
    supportsVision: {
      type: Boolean,
      default: true,
    },
    supportsVoice: {
      type: Boolean,
      default: true,
    },
    supportsReasoning: {
      type: Boolean,
      default: true,
    },
    isProOnly: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AiModel", AiModelSchema);

