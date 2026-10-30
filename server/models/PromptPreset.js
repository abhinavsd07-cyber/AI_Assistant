const mongoose = require("mongoose");

const PromptPresetSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      enum: ["general", "coding", "creative", "productivity", "language", "reasoning"],
      default: "general",
    },
    systemInstruction: {
      type: String,
      required: true,
    },
    starterPrompt: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: "Sparkles",
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PromptPreset", PromptPresetSchema);

