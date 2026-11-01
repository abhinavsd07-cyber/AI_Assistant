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
app.use(express.json({ limit: "25mb" }));

// MongoDB Connection
let isMongoConnected = false;
if (process.env.MONGODB_URI && process.env.MONGODB_URI.trim()) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(async () => {
      isMongoConnected = true;
      console.log("🍃 MongoDB connected successfully!");
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

// Helper for fetching live real-time web search results (Grounding)
async function fetchLiveWebResults(query) {
  try {
    const url = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // 2s fast timeout

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timeout);
    const html = await res.text();
    const snippets = [];
    const regex = /<a class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = regex.exec(html)) !== null && snippets.length < 3) {
      const clean = match[1].replace(/<[^>]+>/g, "").trim();
      if (clean) snippets.push(clean);
    }
    return snippets;
  } catch {
    return [];
  }
}

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api", modelRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Nebula AI",
    status: "Backend is running",
    database: isMongoConnected ? "Connected (MongoDB)" : "Local Storage Mode",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Nebula AI server is healthy",
    database: isMongoConnected ? "Connected" : "Standby",
    modelsReady: true,
  });
});

// Fetch all saved chat sessions from MongoDB
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

// Main Chat endpoint with Contextual History, Documents, Live Web Search Grounding & Sub-Second Latency
app.post("/api/chat", optionalAuth, async (req, res) => {
  const startTime = Date.now();
  try {
    const { 
      message, 
      model: requestedModel, 
      history, 
      image, 
      sessionId, 
      isReasoning,
      isWebSearch 
    } = req.body;

    if (
      typeof message !== "string" ||
      (!message.trim() && !image) ||
      (message && message.length > 25000)
    ) {
      return res.status(400).json({
        success: false,
        error: "Valid message or document/image is required (max 25000 characters).",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "AI API key is not configured.",
      });
    }

    // High-speed candidate models chain:
    // When isReasoning is true -> prioritize deep thinking (gemini-3.8-flash)
    // When isReasoning is false -> ALWAYS prioritize sub-second instant response (gemini-3.5-flash-lite)
    let candidateModels = [];

    if (isReasoning) {
      candidateModels = ["gemini-3.8-flash", "gemini-3.5-flash"];
    } else {
      let preferred = requestedModel;
      if (!preferred || preferred === "Nebula 4.0e" || preferred === "gemini-3.8-flash") {
        preferred = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
      }
      candidateModels = [
        preferred,
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
      ];
    }
    // Deduplicate
    candidateModels = Array.from(new Set(candidateModels.filter(Boolean)));

    const systemInstruction =
      "You are Nebula AI, a helpful, intelligent professional assistant. " +
      "The current year is 2026. Following the May 2026 Kerala Legislative Assembly elections, V. D. Satheesan (UDF) assumed office as the Chief Minister of Kerala on May 18, 2026. " +
      "Always rely on live search results for current leaders, elections, and recent events. " +
      "Answer in Malayalam when the user uses Malayalam or asks for it. " +
      "Be concise, direct, step-by-step, and provide practical examples. Be honest when uncertain.";

    // Build multi-turn context
    const contents = [];

    // Append prior conversational history turns if provided (clean text only to avoid network bloat)
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-6);
      for (const h of recentHistory) {
        if (h.text && h.text.trim()) {
          contents.push({
            role: h.sender === "user" ? "user" : "model",
            parts: [{ text: h.text.trim() }],
          });
        }
      }
    }

    const trimmedMsg = (message || "").trim();

    // Check if web search should be performed (explicit or query-based for current facts)
    const shouldSearch =
      isWebSearch ||
      /(current|latest|who is|now|today|cm|minister|election|2026|ഇപ്പോഴത്തെ|നിലവിലെ|ആരാണ്|മുഖ്യമന്ത്രി|വാർത്ത)/i.test(
        trimmedMsg
      );

    let searchGrounding = "";
    if (shouldSearch && trimmedMsg) {
      try {
        const snippets = await fetchLiveWebResults(trimmedMsg);
        if (snippets.length > 0) {
          searchGrounding =
            `[REAL-TIME LIVE WEB SEARCH GROUNDING (Current Date: October 2026)]:\n` +
            snippets.map((s, idx) => `• ${s}`).join("\n") +
            `\nUse the above verified live search information as the authoritative factual truth.\n\n`;
        }
      } catch (searchErr) {
        console.warn("Live web search warning:", searchErr.message);
      }
    }

    // Build current user message parts (supports Web Grounding, Image, PDF, Code, & Text)
    const currentParts = [];

    if (searchGrounding) {
      currentParts.push({ text: searchGrounding });
    }

    if (image && image.data && image.mimeType) {
      const isTextDoc =
        image.mimeType.startsWith("text/") ||
        image.mimeType === "application/json" ||
        image.mimeType === "application/javascript" ||
        image.mimeType === "application/typescript" ||
        image.mimeType === "application/x-python";

      if (isTextDoc) {
        try {
          const decodedText = Buffer.from(image.data, "base64").toString("utf-8");
          currentParts.push({
            text: `[Attached File: ${image.name || "document"}]:\n\`\`\`\n${decodedText}\n\`\`\`\n`,
          });
        } catch {
          currentParts.push({
            inlineData: {
              mimeType: image.mimeType,
              data: image.data,
            },
          });
        }
      } else {
        // PDF or Image native inlineData
        currentParts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data,
          },
        });
      }
    }

    if (trimmedMsg) {
      currentParts.push({ text: trimmedMsg });
    } else if (image) {
      currentParts.push({ text: `Please analyze and summarize the attached ${image.name || "file"} in detail.` });
    }

    contents.push({
      role: "user",
      parts: currentParts,
    });

    // Helper for saving session and usage analytics to MongoDB in background
    const saveSession = async (replyText, modelUsed, latency) => {
      if (!isMongoConnected || !sessionId) return;
      try {
        const userMsg = {
          id: `msg-${Date.now()}`,
          sender: "user",
          text: trimmedMsg || `[Attached: ${image?.name || "file"}]`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          imageUrl: image && image.previewUrl && image.mimeType?.startsWith("image/") ? image.previewUrl : null,
          fileName: image ? image.name || null : null,
          fileType: image ? image.mimeType || null : null,
          isReasoning: !!isReasoning,
        };
        const assistantMsg = {
          id: `msg-${Date.now() + 1}`,
          sender: "assistant",
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        const sessionTitle = trimmedMsg
          ? trimmedMsg.slice(0, 32)
          : (image?.name ? image.name.slice(0, 32) : "Conversation");

        const updateData = {
          $setOnInsert: {
            title: sessionTitle,
            userId: req.user ? req.user._id : null,
            userEmail: req.user ? req.user.email : null,
          },
          $set: { model: modelUsed },
          $push: { messages: { $each: [userMsg, assistantMsg] } },
        };

        await ChatSession.findOneAndUpdate({ sessionId }, updateData, {
          upsert: true,
          new: true,
        });

        if (req.user) {
          await User.findByIdAndUpdate(req.user._id, {
            $inc: {
              "usage.totalRequests": 1,
              "usage.totalTokens": Math.round(((trimmedMsg.length || 20) + replyText.length) / 4),
            },
            $set: { "usage.lastActive": new Date() },
          });
        }

        await UsageLog.create({
          userId: req.user ? req.user._id : null,
          sessionId,
          model: modelUsed,
          promptLength: trimmedMsg.length,
          replyLength: replyText.length,
          estimatedTokens: Math.round(((trimmedMsg.length || 20) + replyText.length) / 4),
          latencyMs: latency,
          hasImage: !!image,
          isReasoning: !!isReasoning,
          status: "success",
        });
      } catch (dbErr) {
        console.warn("Could not save chat/usage to MongoDB:", dbErr.message);
      }
    };

    // If client requested real-time streaming (SSE)
    if (req.body.stream) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      if (typeof res.flushHeaders === "function") {
        res.flushHeaders();
      }
      if (res.socket) {
        res.socket.setNoDelay(true);
      }

      let streamSuccess = false;
      let fullReply = "";
      let usedModel = candidateModels[0];

      for (const model of candidateModels) {
        try {
          const responseStream = await ai.models.generateContentStream({
            model,
            contents,
            config: { systemInstruction },
          });

          for await (const chunk of responseStream) {
            if (chunk.text) {
              fullReply += chunk.text;
              res.write(`data: ${JSON.stringify({ chunk: chunk.text })}\n\n`);
              if (typeof res.flush === "function") {
                res.flush();
              }
            }
          }

          if (fullReply) {
            usedModel = model;
            streamSuccess = true;
            break;
          }
        } catch (streamErr) {
          console.warn(`Stream model '${model}' error: ${streamErr.message}. Trying next model...`);
        }
      }

      if (!streamSuccess) {
        res.write(`data: ${JSON.stringify({ error: "Failed to generate AI response" })}\n\n`);
        return res.end();
      }

      const latencyMs = Date.now() - startTime;
      res.write(`data: ${JSON.stringify({ done: true, modelUsed: usedModel, latencyMs })}\n\n`);
      res.end();

      // Persist to MongoDB asynchronously without blocking client completion
      saveSession(fullReply, usedModel, latencyMs).catch((dbErr) => {
        console.warn("Async saveSession error:", dbErr.message);
      });
      return;
    }

    // Standard Non-Streaming JSON Response Fallback
    let response;
    let lastError;
    let usedModel = candidateModels[0];

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
        console.warn(`Model '${model}' unavailable: ${err.message}. Trying next model...`);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("All available AI models are currently busy. Please try again.");
    }

    const latencyMs = Date.now() - startTime;

    // Persist in background without blocking
    saveSession(response.text, usedModel, latencyMs).catch((dbErr) => {
      console.warn("Async saveSession error:", dbErr.message);
    });

    res.json({
      success: true,
      reply: response.text,
      modelUsed: usedModel,
      latencyMs,
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
    console.log(`✨ Nebula AI server running on port ${PORT}`);
  });
}

module.exports = { app };
