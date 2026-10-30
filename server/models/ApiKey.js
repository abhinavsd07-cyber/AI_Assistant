const mongoose = require("mongoose");

const ApiKeySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    label: {
      type: String,
      default: "Default Gemini Key",
    },
    provider: {
      type: String,
      enum: ["gemini", "openai", "anthropic"],
      default: "gemini",
    },
    maskedKey: {
      type: String,
      required: true,
    },
    encryptedKey: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ApiKey", ApiKeySchema);

