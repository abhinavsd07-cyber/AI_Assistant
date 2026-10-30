const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const { ChatSession, User, UsageLog } = require("./models");
const authRoutes = require("./routes/auth");
const { router: modelRoutes, seedDefaultsIfNeeded } = require("./routes/models");
const { optionalAuth } = require("./middleware/auth");

const app = express();

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  })
);

// Support large payloads for image and document analysis
app.use(express.json({ limit: "15mb" }));

// MongoDB Connection
let isMongoConnected = false;
if (process.env.MONGODB_URI && process.env.MONGODB_URI.trim()) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(async () => {
      isMongoConnected = true;
      console.log("🍃 MongoDB connected successfully!");
      // Seed default AI models & personas if first time
      await seedDefaultsIfNeeded();
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

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api", modelRoutes);

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
    modelsReady: true,
  });
});

// Fetch all saved chat sessions from MongoDB (optionally scoped to user)
app.get("/api/sessions", optionalAuth, async (req, res) => {
  try {
    if (!isMongoConnected) {
      return res.json({ success: true, sessions: [] });
    }

    const query = req.user
      ? { $or: [{ userId: req.user._id }, { userId: null }] }
      : {};

    const sessions = await ChatSession.find(query).sort({ updatedAt: -1 }).limit(40);
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a session from MongoDB
app.delete("/api/sessions/:sessionId", optionalAuth, async (req, res) => {
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
app.post("/api/chat", optionalAuth, async (req, res) => {
  const startTime = Date.now();
  try {
    const { message, model: requestedModel, history, image, sessionId, isReasoning } = req.body;

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
      "gemini-3.5-flash",
      "gemini-1.5-flash",
    ].filter(Boolean).filter((m, i, arr) => arr.indexOf(m) === i);

    const systemInstruction =
      "You are NEXORA AI (Nebula), a helpful professional assistant. " +
      "Answer in Malayalam when the user uses Malayalam or asks for it. " +
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
    let usedModel = normalizedModel;

    for (const model of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config: { systemInstruction },
        });

        if (response?.text) {
          usedModel = model;
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

    const latencyMs = Date.now() - startTime;

    // Persist conversation to MongoDB if database is connected
    if (isMongoConnected && sessionId) {
      try {
        const userMsg = {
          id: `msg-${Date.now()}`,
          sender: "user",
          text: message.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          imageUrl: image ? image.previewUrl || null : null,
          isReasoning: !!isReasoning,
        };
        const assistantMsg = {
          id: `msg-${Date.now() + 1}`,
          sender: "assistant",
          text: response.text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        const updateData = {
          $setOnInsert: {
            title: message.trim().slice(0, 32),
            userId: req.user ? req.user._id : null,
            userEmail: req.user ? req.user.email : null,
          },
          $set: { model: usedModel },
          $push: { messages: { $each: [userMsg, assistantMsg] } },
        };

        await ChatSession.findOneAndUpdate({ sessionId }, updateData, {
          upsert: true,
          new: true,
        });

        // Update user usage statistics if authenticated
        if (req.user) {
          await User.findByIdAndUpdate(req.user._id, {
            $inc: {
              "usage.totalRequests": 1,
              "usage.totalTokens": Math.round((message.length + response.text.length) / 4),
            },
            $set: { "usage.lastActive": new Date() },
          });
        }

        // Log usage in UsageLog model
        await UsageLog.create({
          userId: req.user ? req.user._id : null,
          sessionId,
          model: usedModel,
          promptLength: message.length,
          replyLength: response.text.length,
          estimatedTokens: Math.round((message.length + response.text.length) / 4),
          latencyMs,
          hasImage: !!image,
          isReasoning: !!isReasoning,
          status: "success",
        });
      } catch (dbErr) {
        console.warn("Could not save chat/usage to MongoDB:", dbErr.message);
      }
    }

    res.json({
      success: true,
      reply: response.text,
      modelUsed: usedModel,
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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`NEXORA AI running on port ${PORT}`);
  });
}

module.exports = { app };
