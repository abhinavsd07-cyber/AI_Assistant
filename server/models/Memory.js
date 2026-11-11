const mongoose = require("mongoose");

const memorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    userEmail: {
      type: String,
      default: "guest@nebula.local",
      index: true,
    },
    category: {
      type: String,
      enum: ["preference", "identity", "project", "skill", "fact"],
      default: "fact",
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
    confidence: {
      type: Number,
      default: 0.9,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Memory", memorySchema);

