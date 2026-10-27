const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  sender: { type: String, enum: ["user", "assistant"], required: true },
  text: { type: String, required: true },
  timestamp: { type: String, required: true },
  imageUrl: { type: String, default: null },
});

const ChatSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    model: { type: String, default: "gemini-3.8-flash" },
    messages: [MessageSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatSession", ChatSessionSchema);
