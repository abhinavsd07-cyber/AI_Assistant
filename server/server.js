const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const { GoogleGenAI } = require("@google/genai");
const ChatSession = require("./models/ChatSession");

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Support large payloads for image and document analysis
app.use(express.json({ limit: "15mb" }));

// MongoDB Connection
let isMongoConnected = false;
if (process.env.MONGODB_URI && process.env.MONGODB_URI.trim()) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      isMongoConnected = true;
      console.log("🍃 MongoDB connected successfully!");
    })
    .catch((err) => {
      console.warn("⚠️ MongoDB connection warning:", err.message);
    });
} else {
  console.log("ℹ️ MONGODB_URI not set in .env. Running with local storage fallback.");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to NEXORA AI",
    status: "Backend is running",
    database: isMongoConnected ? "Connected (MongoDB)" : "Local Storage Mode",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "NEXORA AI server is healthy",
    database: isMongoConnected ? "Connected" : "Standby",
  });
});

// Fetch all saved chat sessions from MongoDB
app.get("/api/sessions", async (req, res) => {
  try {
    if (!isMongoConnected) {
      return res.json({ success: true, sessions: [] });
    }
    const sessions = await ChatSession.find().sort({ updatedAt: -1 }).limit(30);
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a session from MongoDB
app.delete("/api/sessions/:sessionId", async (req, res) => {
  try {
    if (isMongoConnected) {
      await ChatSession.deleteOne({ sessionId: req.params.sessionId });
    }
    res.json({ success: true, message: "Session deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Main Chat endpoint with Contextual History & Multimodal Vision
app.post("/api/chat", async (req, res) => {
  try {
    const { message, model: requestedModel, history, image, sessionId } = req.body;

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 8000
    ) {
      return res.status(400).json({
        success: false,
        error: "Valid message is required (max 8000 characters).",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "AI API key is not configured.",
      });
    }

    // Map UI model names to official API model IDs if needed
    const normalizedModel =
      requestedModel === "Nebula 4.0e"
        ? (process.env.GEMINI_MODEL || "gemini-3.8-flash")
        : requestedModel;

    const candidateModels = [
      normalizedModel,
      process.env.GEMINI_MODEL || "gemini-3.8-flash",
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
      "gemma-4-26b-a4b-it",
      "gemini-3.5-flash",
    ].filter(Boolean).filter((m, i, arr) => arr.indexOf(m) === i);

    const systemInstruction =
      "You are NEXORA AI, a helpful professional assistant. " +
      "Answer in Malayalam when the user uses Malayalam. " +
      "Explain programming concepts step by step and provide " +
      "correct, practical examples. Be honest when uncertain.";

    // Build multi-turn context
    const contents = [];

    // Append prior conversational history turns if provided
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-8);
      for (const h of recentHistory) {
        if (h.text && h.text.trim()) {
          contents.push({
            role: h.sender === "user" ? "user" : "model",
            parts: [{ text: h.text.trim() }],
          });
        }
      }
    }

    // Build current user message parts (supports Image + Text)
    const currentParts = [];
    if (image && image.data && image.mimeType) {
      currentParts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data,
        },
      });
    }
    currentParts.push({ text: message.trim() });

    contents.push({
      role: "user",
      parts: currentParts,
    });

    let response;
    let lastError;

    for (const model of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config: { systemInstruction },
        });

        if (response?.text) {
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(
          `Model '${model}' unavailable: ${err.message}. Trying next available model...`
        );

        if (
          err.message?.includes("503") ||
          err.message?.includes("high demand")
        ) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    }

    if (!response || !response.text) {
      throw (
        lastError ||
        new Error("All available AI models are currently busy. Please try again.")
      );
    }

    // Persist conversation to MongoDB if database is connected
    if (isMongoConnected && sessionId) {
      try {
        const userMsg = {
          id: `msg-${Date.now()}`,
          sender: "user",
          text: message.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          imageUrl: image ? image.previewUrl || null : null,
        };
        const assistantMsg = {
          id: `msg-${Date.now() + 1}`,
          sender: "assistant",
          text: response.text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        await ChatSession.findOneAndUpdate(
          { sessionId },
          {
            $setOnInsert: { title: message.trim().slice(0, 32) },
            $set: { model: normalizedModel },
            $push: { messages: { $each: [userMsg, assistantMsg] } },
          },
          { upsert: true, new: true }
        );
      } catch (dbErr) {
        console.warn("Could not save chat to MongoDB:", dbErr.message);
      }
    }

    res.json({
      success: true,
      reply: response.text,
    });
  } catch (error) {
    console.error("AI request failed:", error.message);

    res.status(500).json({
      success: false,
      error: "AI response failed. Check the server logs and API settings.",
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`NEXORA AI running on port ${PORT}`);
});