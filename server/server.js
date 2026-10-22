const express = require("express");
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: "10kb" }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to NEXORA AI",
    status: "Backend is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "NEXORA AI server is healthy",
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, model: requestedModel } = req.body;

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 4000
    ) {
      return res.status(400).json({
        success: false,
        error: "Valid message is required (max 4000 characters).",
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
        ? (process.env.GEMINI_MODEL || "gemini-3.5-flash")
        : requestedModel;

    const candidateModels = [
      normalizedModel,
      process.env.GEMINI_MODEL || "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.8-flash",
    ].filter(Boolean).filter((m, i, arr) => arr.indexOf(m) === i);

    const systemInstruction =
      "You are NEXORA AI, a helpful professional assistant. " +
      "Answer in Malayalam when the user uses Malayalam. " +
      "Explain programming concepts step by step and provide " +
      "correct, practical examples. Be honest when uncertain.";

    let response;
    let lastError;

    for (const model of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: message.trim(),
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