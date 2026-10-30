const mongoose = require("mongoose");

const UsageLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    sessionId: {
      type: String,
      default: null,
    },
    model: {
      type: String,
      required: true,
    },
    promptLength: {
      type: Number,
      default: 0,
    },
    replyLength: {
      type: Number,
      default: 0,
    },
    estimatedTokens: {
      type: Number,
      default: 0,
    },
    latencyMs: {
      type: Number,
      default: 0,
    },
    hasImage: {
      type: Boolean,
      default: false,
    },
    isReasoning: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["success", "error"],
      default: "success",
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

UsageLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("UsageLog", UsageLogSchema);

