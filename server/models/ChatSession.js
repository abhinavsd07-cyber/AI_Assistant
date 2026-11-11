const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  sender: { type: String, enum: ["user", "assistant"], required: true },
  text: { type: String, required: true },
  timestamp: { type: String, required: true },
  imageUrl: { type: String, default: null },
  fileName: { type: String, default: null },
  fileType: { type: String, default: null },
  isReasoning: { type: Boolean, default: false },
  tokens: { type: Number, default: 0 },
});

const ChatSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    userEmail: {
      type: String,
      default: null,
    },
    title: { type: String, required: true, default: "New Conversation" },
    model: { type: String, default: "gemini-3.8-flash" },
    systemPrompt: { type: String, default: "" },
    pinned: { type: Boolean, default: false },
    isShared: { type: Boolean, default: false },
    tags: [{ type: String }],
    messages: [MessageSchema],
  },
  { timestamps: true }
);

// Index to quickly query sessions by user sorted by last update
ChatSessionSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("ChatSession", ChatSessionSchema);
