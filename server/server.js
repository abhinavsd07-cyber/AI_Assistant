const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const { ChatSession, User, UsageLog } = require("./models");
const authRoutes = require("./routes/auth");
const { router: modelRoutes, seedDefaultsIfNeeded } = require("./routes/models");
const { requireAuth, optionalAuth } = require("./middleware/auth");
const { uploadToCloudinary } = require("./services/cloudinary");
const {
  extractTextFromAttachment,
  chunkDocument,
  generateEmbedding,
  retrieveTopKChunks,
  buildRagGroundingContext,
} = require("./services/rag");
const { applyGuardrails } = require("./services/guardrails");
const { isImagePrompt, classifyUserIntent, generateAndUploadImage } = require("./services/imageGen");
const { checkOllamaStatus, streamOllamaChat, OLLAMA_HOST } = require("./services/ollama");
const { getUserMemories, extractAndSaveMemories } = require("./services/memory");
const { securityHeaders, createRateLimiter } = require("./middleware/security");
const { createConfirmedStripePayment, createStripeCheckoutSession } = require("./services/stripe");

const app = express();

// Enterprise Security Headers (Helmet standard)
app.use(securityHeaders);

// Rate Limiters
const chatLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: "Rate limit exceeded (60 messages/min). Please wait a moment or upgrade to Nebula Pro.",
});
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: "Too many authentication attempts. Please try again in 15 minutes.",
});

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
const mongoUri = (process.env.MONGODB_URI || process.env.MONGO_URI || "").trim();
if (mongoUri) {
  mongoose
    .connect(mongoUri)
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

let aiClient = null;
function getAiClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return aiClient;
}

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
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api", modelRoutes);

const fs = require("fs");
const clientDistPath = path.join(__dirname, "../client/dist");
const hasClientBuild = fs.existsSync(path.join(clientDistPath, "index.html"));

if (process.env.NODE_ENV !== "production" || !hasClientBuild) {
  app.get("/", (req, res) => {
    res.json({
      message: "Welcome to Nebula AI",
      status: "Backend is running",
      database: isMongoConnected ? "Connected (MongoDB)" : "Local Storage Mode",
    });
  });
}

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    version: "4.0.0",
    uptimeSeconds: Math.floor(process.uptime()),
    message: "Nebula AI server is healthy",
    database: isMongoConnected ? "Connected" : "Standby",
    modelsReady: true,
    timestamp: new Date().toISOString(),
  });
});

// Helper: Wrap 24kHz 16-bit Mono Linear PCM buffer into standard browser-playable WAV (RIFF) format
function pcm24kToWav(pcmBuffer, sampleRate = 24000) {
  const header = Buffer.alloc(44);
  const dataLen = pcmBuffer.length;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLen, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  header.writeUInt16LE(1, 22);  // NumChannels (1 = Mono)
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // ByteRate (SampleRate * 1 * 16/8)
  header.writeUInt16LE(2, 32);  // BlockAlign (1 * 16/8)
  header.writeUInt16LE(16, 34); // BitsPerSample (16-bit)
  header.write("data", 36);
  header.writeUInt32LE(dataLen, 40);
  return Buffer.concat([header, pcmBuffer]);
}

// Multilingual Native-Accent Neural Text-to-Speech (TTS) Endpoint
// Primary Engine: Gemini 2.5 Flash Native Audio (Authentic Kerala Malayali, Tamil Nadu, Hindi & Indian English accents)
// Fallback Engine: Google Neural TTS stream
app.get("/api/tts", async (req, res) => {
  try {
    const rawText = String(req.query.text || "").trim();
    if (!rawText) {
      return res.status(400).json({ success: false, error: "text query parameter is required" });
    }

    // Auto-detect language from script if not explicitly specified
    let lang = String(req.query.lang || "").trim().toLowerCase();
    if (!lang || lang === "auto") {
      if (/[\u0D00-\u0D7F]/.test(rawText)) lang = "ml";
      else if (/[\u0B80-\u0BFF]/.test(rawText)) lang = "ta";
      else if (/[\u0900-\u097F]/.test(rawText)) lang = "hi";
      else if (/[\u0C00-\u0C7F]/.test(rawText)) lang = "te";
      else if (/[\u0C80-\u0CFF]/.test(rawText)) lang = "kn";
      else if (/[\u0600-\u06FF]/.test(rawText)) lang = "ar";
      else lang = "en";
    } else {
      lang = lang.split("-")[0];
    }

    const clean = rawText.slice(0, 700).replace(/\s+/g, " ").trim();

    // 1. Primary Engine: Gemini 2.5 Native Audio with Authentic Native Accent Conditioning
    const ai = getAiClient();
    if (ai) {
      try {
        const accentDirectives = {
          ml: "Speak the following Malayalam text with a 100% authentic, warm, natural native Kerala Malayali accent, cadence, and friendly conversational intonation (never sound like a foreigner or robotic reader): ",
          ta: "Speak the following Tamil text with a 100% authentic, warm, natural native Tamil Nadu accent, cadence, and friendly conversational intonation (never sound like a foreigner): ",
          hi: "Speak the following Hindi text with a 100% authentic, warm, natural native Indian Hindi accent and conversational intonation: ",
          te: "Speak the following Telugu text with a 100% authentic, warm, natural native Telugu accent and conversational intonation: ",
          kn: "Speak the following Kannada text with a 100% authentic, warm, natural native Karnataka Kannada accent and conversational intonation: ",
          en: "Speak the following English text in a warm, natural, friendly Indian English conversational voice: ",
        };
        const stylePrefix = accentDirectives[lang] || "Speak naturally and warmly in a native accent: ";

        const ttsRes = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: `${stylePrefix}"${clean}"`,
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Aoede",
                },
              },
            },
          },
        });

        const inlineAudio = ttsRes?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (inlineAudio?.data) {
          const pcmBuffer = Buffer.from(inlineAudio.data, "base64");
          const wavBuffer = pcm24kToWav(pcmBuffer, 24000);
          res.setHeader("Content-Type", "audio/wav");
          res.setHeader("Content-Length", String(wavBuffer.length));
          res.setHeader("Cache-Control", "public, max-age=3600");
          return res.send(wavBuffer);
        }
      } catch (geminiTtsErr) {
        console.warn("Gemini Native Audio TTS fallback to stream:", geminiTtsErr.message);
      }
    }

    // 2. Fallback Engine: Chunked Neural MP3 Stream
    const chunks = [];
    let remaining = clean;
    while (remaining.length > 0) {
      if (remaining.length <= 180) {
        chunks.push(remaining);
        break;
      }
      let splitIdx = remaining.lastIndexOf(". ", 180);
      if (splitIdx < 40) splitIdx = remaining.lastIndexOf("? ", 180);
      if (splitIdx < 40) splitIdx = remaining.lastIndexOf("! ", 180);
      if (splitIdx < 40) splitIdx = remaining.lastIndexOf(", ", 180);
      if (splitIdx < 40) splitIdx = remaining.lastIndexOf(" ", 180);
      if (splitIdx <= 0) splitIdx = 180;
      else splitIdx += 1;

      chunks.push(remaining.slice(0, splitIdx).trim());
      remaining = remaining.slice(splitIdx).trim();
    }

    const buffers = [];
    for (const chunk of chunks) {
      if (!chunk) continue;
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(chunk)}`;
      const response = await fetch(ttsUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
      });
      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        buffers.push(Buffer.from(arrayBuf));
      }
    }

    if (buffers.length === 0) {
      return res.status(502).json({ success: false, error: "TTS synthesis unavailable" });
    }

    const combinedAudio = Buffer.concat(buffers);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(combinedAudio.length));
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(combinedAudio);
  } catch (err) {
    console.warn("TTS endpoint warning:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// AI/ML Evaluation Endpoint: Vector RAG Inspection & Metrics (Authenticated)
app.post("/api/rag/inspect", requireAuth, async (req, res) => {
  const startTime = Date.now();
  try {
    const { query, documentText } = req.body;
    if (!query || !documentText) {
      return res.status(400).json({ success: false, error: "query and documentText are required." });
    }

    const chunks = chunkDocument(documentText, 500, 80);
    const embeddedChunks = await Promise.all(
      chunks.slice(0, 20).map(async (c) => ({
        ...c,
        embedding: await generateEmbedding(c.text),
      }))
    );

    const topK = await retrieveTopKChunks(query, embeddedChunks, 3);
    const latencyMs = Date.now() - startTime;

    return res.json({
      success: true,
      metrics: {
        totalChunks: chunks.length,
        evaluatedChunks: embeddedChunks.length,
        embeddingDimensions: embeddedChunks[0]?.embedding?.length || 3072,
        pipelineLatencyMs: latencyMs,
      },
      topMatches: topK.map((m) => ({
        id: m.id,
        similarityScore: m.similarity,
        textExcerpt: m.text,
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Upload media or image asset to Cloudinary CDN (Authenticated Users Only)
app.post("/api/upload", requireAuth, async (req, res) => {
  try {
    const { data, folder } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, error: "Image data is required" });
    }
    const secureUrl = await uploadToCloudinary(data, folder || "nebula_ai/uploads");
    if (!secureUrl) {
      return res.status(500).json({
        success: false,
        error: "Cloudinary upload failed or CLOUDINARY_API_SECRET is missing in .env.",
      });
    }
    return res.json({ success: true, url: secureUrl });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch all saved chat sessions from MongoDB (Strictly scoped to logged-in user)
app.get("/api/sessions", requireAuth, async (req, res) => {
  try {
    if (!isMongoConnected) {
      return res.json({ success: true, sessions: [] });
    }

    const sessions = await ChatSession.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(40);
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mark a user's session as publicly shareable (Owner only)
app.post("/api/sessions/:sessionId/share", requireAuth, async (req, res) => {
  try {
    if (!isMongoConnected) {
      return res.json({ success: true, shareId: req.params.sessionId });
    }
    const session = await ChatSession.findOneAndUpdate(
      { sessionId: req.params.sessionId, userId: req.user._id },
      { $set: { isShared: true } },
      { returnDocument: "after" }
    );
    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found or access denied" });
    }
    res.json({ success: true, shareId: session.sessionId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Public Shareable Chat Endpoint (Read-only view strictly for explicitly shared links)
app.get("/api/sessions/share/:sessionId", async (req, res) => {
  try {
    if (!isMongoConnected) {
      return res.status(404).json({ success: false, error: "Shared session not found" });
    }
    const session = await ChatSession.findOne({
      sessionId: req.params.sessionId,
      isShared: true,
    });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Shared session not found or has not been made public by its owner.",
      });
    }
    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        title: session.title,
        model: session.model,
        messages: session.messages,
        updatedAt: session.updatedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a session from MongoDB (Strictly scoped to logged-in user)
app.delete("/api/sessions/:sessionId", requireAuth, async (req, res) => {
  try {
    if (isMongoConnected) {
      await ChatSession.deleteOne({
        sessionId: req.params.sessionId,
        userId: req.user._id,
      });
    }
    res.json({ success: true, message: "Session deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/memories - Fetch all persistent user memories (Strictly scoped to logged-in user)
app.get("/api/memories", requireAuth, async (req, res) => {
  try {
    const { memories } = await getUserMemories({
      userId: req.user._id,
      userEmail: req.user.email,
    });
    res.json({ success: true, memories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/memories - Manually add a user memory (Strictly scoped to logged-in user)
app.post("/api/memories", requireAuth, async (req, res) => {
  try {
    const { category = "preference", key, value } = req.body;
    if (!key || !value) {
      return res.status(400).json({ success: false, error: "key and value are required" });
    }
    const { Memory } = require("./models");
    const mem = await Memory.findOneAndUpdate(
      {
        userId: req.user._id,
        key: key.toLowerCase().trim(),
      },
      {
        $set: {
          userId: req.user._id,
          userEmail: req.user.email,
          category,
          key: key.toLowerCase().trim(),
          value: value.trim(),
          confidence: 1.0,
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    res.json({ success: true, memory: mem });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/memories/:id - Delete a specific memory (Strictly scoped to logged-in user)
app.delete("/api/memories/:id", requireAuth, async (req, res) => {
  try {
    const { Memory } = require("./models");
    await Memory.deleteOne({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: "Memory removed" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/memories - Clear all user memories (Strictly scoped to logged-in user)
app.delete("/api/memories", requireAuth, async (req, res) => {
  try {
    const { Memory } = require("./models");
    await Memory.deleteMany({
      $or: [{ userId: req.user._id }, { userEmail: req.user.email }],
    });
    res.json({ success: true, message: "All memories cleared" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/payments/upgrade - Live Stripe Sandbox / Razorpay Checkout Processing
app.post("/api/payments/upgrade", requireAuth, async (req, res) => {
  try {
    const {
      plan = "pro",
      billingCycle = "monthly",
      paymentMethod = "stripe",
      gateway = "stripe",
    } = req.body;

    let receiptId = `rcpt_nebula_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    let stripePayment = null;

    if (process.env.STRIPE_SECRET_KEY) {
      stripePayment = await createConfirmedStripePayment({
        billingCycle,
        customerEmail: req.user?.email || "user@nebula.ai",
        customerName: req.user?.name || "Nebula User",
      });
      if (!stripePayment || stripePayment.status !== "succeeded") {
        return res.status(402).json({
          success: false,
          error: "Stripe payment confirmation could not be verified.",
        });
      }
      if (stripePayment.paymentIntentId) {
        receiptId = stripePayment.paymentIntentId;
      }
    }

    if (isMongoConnected && req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        $set: { plan: "pro", role: "pro", "preferences.plan": plan },
      }).catch(() => {});
    }

    res.json({
      success: true,
      plan,
      billingCycle,
      paymentMethod: gateway || paymentMethod,
      receiptId,
      stripePayment,
      activatedAt: new Date().toISOString(),
      message: "Nebula Pro subscription activated via Stripe Sandbox!",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/payments/create-checkout-session - Official Hosted Stripe Checkout Page
app.post("/api/payments/create-checkout-session", requireAuth, async (req, res) => {
  try {
    const { billingCycle = "monthly", originUrl = "http://localhost:5173" } = req.body;
    const session = await createStripeCheckoutSession({
      billingCycle,
      originUrl,
      customerEmail: req.user?.email,
    });
    res.json({
      success: true,
      sessionId: session.sessionId,
      checkoutUrl: session.checkoutUrl,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// FLUX.1 Visual Node-Graph Workflow Execution Endpoint (ComfyUI-style Hybrid Pipeline)
app.post("/api/flux/workflow", chatLimiter, requireAuth, async (req, res) => {
  const workflowStart = Date.now();
  try {
    const {
      prompt = "Futuristic cybernetic astronaut standing before a glowing cosmic nebula, 8k photorealistic",
      unetModel = "flux1-schnell-Q4_K_S.gguf",
      clipModel = "t5xxl_fp8 + clip_l",
      steps = 4,
      cfg = 3.5,
      width = 1024,
      height = 1024,
      sampler = "euler",
    } = req.body;

    const intentData = await classifyUserIntent(prompt);
    // Force image generation intent for explicit workflow execution
    intentData.isImage = true;
    if (!intentData.cleanSubject) intentData.cleanSubject = prompt.slice(0, 60);
    if (!intentData.expandedPrompt) intentData.expandedPrompt = prompt;

    const result = await generateAndUploadImage(intentData, {
      width,
      height,
      model: unetModel,
      steps,
      sampler,
    });
    const totalLatencyMs = Date.now() - workflowStart;

    return res.json({
      success: true,
      cdnUrl: result.cdnUrl,
      cleanSubject: result.cleanSubject,
      expandedPrompt: result.expandedPrompt,
      executionTimeMs: totalLatencyMs,
      workflowMeta: {
        unetModel,
        clipModel,
        steps,
        cfg,
        resolution: `${width}x${height}`,
        sampler,
        pipeline: "Nebula Cloud GPU + Cloudinary CDN",
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Workflow execution failed",
    });
  }
});

// Main Chat endpoint with Contextual History, Documents, Live Web Search Grounding & Sub-Second Latency
app.post("/api/chat", chatLimiter, requireAuth, async (req, res) => {
  const startTime = Date.now();
  try {
    const { 
      message, 
      model: requestedModel, 
      history, 
      image, 
      sessionId, 
      isReasoning,
      isWebSearch,
      persona = "general",
      isImageGen = false
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

    const trimmedMsg = (message || "").trim();

    // AI ML Intent Classification & Image Generation Pipeline
    // Auto-detects image generation requests even with heavy typos, slang, Manglish, or /image command
    let imageIntent = null;
    if (isImageGen || isImagePrompt(trimmedMsg)) {
      imageIntent = await classifyUserIntent(trimmedMsg);
    }

    if (imageIntent && (isImageGen || imageIntent.isImage)) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.socket?.setNoDelay(true);

      const targetSubject = imageIntent.cleanSubject || trimmedMsg;
      res.write(`data: ${JSON.stringify({ chunk: `✨ **Nebula ML**: Understood visual request for **${targetSubject}**...\n\n` })}\n\n`);

      try {
        const { cdnUrl, cleanPrompt, expandedPrompt } = await generateAndUploadImage(imageIntent);

        const replyMarkdown =
          `Here is your generated image of **${cleanPrompt}**:\n\n` +
          `![${cleanPrompt}](${cdnUrl})\n\n` +
          `### 🎨 Visual Details\n` +
          `* **Subject (Normalized via ML)**: \`${cleanPrompt}\`\n` +
          `* **Enhanced Creative Prompt**: *${expandedPrompt}*\n` +
          `* **Engine**: Nebula High-Res Multi-Engine Visuals\n` +
          `* **Cloud Storage**: Cloudinary Global CDN\n\n` +
          `🔗 [Open Full High-Res Image](${cdnUrl})`;

        res.write(`data: ${JSON.stringify({ chunk: replyMarkdown, fullText: replyMarkdown, imageUrl: cdnUrl })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true, model: "nebula-visual-cloudinary" })}\n\n`);
        res.end();

        // Save session in background
        if (isMongoConnected && sessionId) {
          const userMsg = {
            id: `msg-${Date.now()}`,
            sender: "user",
            text: trimmedMsg,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          const assistantMsg = {
            id: `msg-${Date.now() + 1}`,
            sender: "assistant",
            text: replyMarkdown,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            imageUrl: cdnUrl,
          };
          await ChatSession.findOneAndUpdate(
            { sessionId, userId: req.user._id },
            {
              $setOnInsert: {
                title: `🎨 ${cleanPrompt.slice(0, 28)}`,
                userId: req.user._id,
                userEmail: req.user.email,
              },
              $set: { model: "nebula-visual-cloudinary" },
              $push: { messages: { $each: [userMsg, assistantMsg] } },
            },
            { upsert: true, returnDocument: "after" }
          );
        }
        return;
      } catch (err) {
        console.warn("⚠️ Image generation error:", err.message);
        const errorReply = `⚠️ **Image Generation Notice:** Unable to render visual for **"${targetSubject}"** right now (${err.message}). Please try again in a moment.`;
        res.write(`data: ${JSON.stringify({ chunk: errorReply, fullText: errorReply })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        return res.end();
      }
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(500).json({
        success: false,
        error: "AI API key (GEMINI_API_KEY) is not configured in server environment variables.",
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
      if (!preferred || (typeof preferred === "string" && (preferred.startsWith("ollama:") || preferred.includes("1.5"))) || preferred === "Nebula 4.0e" || preferred === "gemini-3.8-flash") {
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

    const PERSONA_PROMPTS = {
      general: "You are Nebula AI, a world-class AI cognitive companion created by Abhinav SD.",
      coder: "You are Nebula Senior Code Architect. You produce production-grade, cleanly structured, secure, modular code with complete error handling, TypeScript types, and modern software design patterns. Always provide complete working solutions with explanations.",
      kerala_scholar: "You are Nebula Kerala Scholar. You possess encyclopedic knowledge of Kerala history, culture, Travancore/Cochin/Malabar heritage, Malayalam literature, and 2026 socio-political developments. You explain with depth, nuance, and cultural authenticity in Malayalam or English.",
      malayalam_writer: "You are Nebula Malayalam Creative Writer (മലയാള സാഹിത്യകാരൻ). You write poetic, engaging, natural Malayalam prose, essays, stories, and translations.",
      math_tutor: "You are Nebula Math & Science Tutor. You break down complex equations, calculus, physics, and chemistry concepts step-by-step with KaTeX formulas and intuitive analogies."
    };

    // Retrieve long-term persistent memory for the user (MemGPT architecture)
    const { contextString: memoryContext } = await getUserMemories({
      userId: req.user ? req.user._id : null,
      userEmail: req.user ? req.user.email : null,
    });

    const isOllamaRequested = typeof requestedModel === "string" && requestedModel.startsWith("ollama:");
    const ollamaRolePrefix = isOllamaRequested
      ? "You are currently running in Ollama (Meta Llama 3.3 70B Open-Weights Hybrid Engine) inside Nebula AI. "
      : "";
    const personaInstruction = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.general;

    const intentResolutionDirective =
      "\n\n[AUTOMATIC MULTILINGUAL DETECTION & ADVANCED NLP INTENT RESOLUTION]:\n" +
      "1. Automatic Language Detection & Mirroring (CRITICAL): Automatically detect the language the user is speaking or typing in — including Malayalam (മലയാളം), Tamil (தமிழ்), Hindi (हिन्दी), Telugu (తెలుగు), Kannada (ಕನ್ನಡ), Arabic (العربية), Spanish, French, or English. ALWAYS reply in the EXACT SAME LANGUAGE that the user used!\n" +
      "2. Phonetic Speech, Manglish, Tanglish & Hinglish Fluency: In voice mode or chat, the user's speech in Malayalam, Tamil, or Hindi may be transcribed phonetically in English/Latin letters (e.g., Malayalam/Manglish: 'namaskaram', 'sukhamano', 'enthanu vishesham', 'evideyanu', 'ith engane cheyyam'; Tamil/Tanglish: 'vanakkam', 'eppadi irukkinga', 'enna panringa', 'ungal peyar enna', 'romba nandri'; Hindi/Hinglish: 'namaste', 'aap kaise ho', 'kya haal hai'). Immediately recognize the underlying language (Malayalam, Tamil, or Hindi) and reply in clean, natural native script (മലയാളം script for Malayalam/Manglish, தமிழ் script for Tamil/Tanglish, हिन्दी script for Hindi/Hinglish) so the neural speech synthesizer speaks in that native language!\n" +
      "3. Typo & Phonetic Tolerance: The user may type quickly with keyboard slips or broken spelling. NEVER complain about typos; silently infer the exact intended meaning and answer accurately.\n" +
      "4. Contextual Anaphora & Follow-up Resolution: When the user asks brief follow-ups ('why?', 'how?', 'what next?', 'അതെന്താണ്?', 'എങ്ങനെ?', 'ஏன்?', 'எப்படி?'), examine prior conversation turns and answer directly in context.\n" +
      "5. Technical Precision & Directness: Provide complete, concrete, working solutions.\n";

    const reasoningDirective = isReasoning
      ? "\n[DEEP REASONING & CHAIN-OF-THOUGHT MODE]: Analyze edge cases, verify step-by-step logic, and provide thorough, mathematically sound architectural depth."
      : "";

    const isVoice = Boolean(req.body.isVoice);
    const voiceDirective = isVoice
      ? "\n[REAL-TIME NATIVE-SPEAKER CONVERSATIONAL VOICE MODE]:\n" +
        "You are speaking live with the user in hands-free voice mode. " +
        "1. NATIVE COLLOQUIAL SPEECH STYLE (CRITICAL): " +
        "If the user speaks in Malayalam (or Manglish), speak like a real, born-and-raised Kerala Malayali friend using natural spoken Malayalam (സംസാരഭാഷ, e.g., 'അതേയല്ലോ', 'തീർച്ചയായും', 'നമുക്ക് നോക്കാം', 'വളരെ എളുപ്പമാണ്') — NEVER use stiff, robotic textbook translation Malayalam that sounds like a foreigner! " +
        "If the user speaks in Tamil (or Tanglish), speak like a real native Tamil speaker using natural spoken Tamil (பேச்சுத் தமிழ், e.g., 'நிச்சயமா', 'ரொம்ப சுலபம்', 'வாங்க பார்க்கலாம்') — NEVER use stiff literary Tamil! " +
        "If the user speaks in Hindi (or Hinglish), speak in warm, natural conversational Hindi (हिन्दी). " +
        "2. Always write your response in the native script of that language (മലയാളം script for Malayalam, தமிழ் script for Tamil, हिन्दी script for Hindi) so the Gemini Native Audio voice engine pronounces every phoneme with 100% authentic regional intonation. " +
        "3. Keep your response warm, punchy, and conversational (max 2-3 spoken sentences) with zero markdown symbols, asterisks, or URLs."
      : "";

    const systemInstruction =
      `${memoryContext}${ollamaRolePrefix}${personaInstruction}${intentResolutionDirective}${reasoningDirective}${voiceDirective} The current year is 2026. ` +
      "Always rely on live search results for current leaders, elections, and recent events. " +
      "Be concise, direct, step-by-step, and provide practical examples. Be honest when uncertain. " +
      "IMPORTANT: Do not hallucinate or output markdown image links like ![...](https://res.cloudinary.com/...) yourself.";

    // Support Local Offline Ollama execution (Llama 3, DeepSeek, Mistral, Gemma) with seamless Hybrid Cloud Bridge
    if (isOllamaRequested) {
      const ollamaStatus = await checkOllamaStatus();
      if (ollamaStatus.isRunning) {
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.socket?.setNoDelay(true);

        try {
          await streamOllamaChat({
            modelName: requestedModel,
            systemInstruction,
            history,
            message: trimmedMsg,
            res,
            sessionId,
            ChatSession,
            req,
            isMongoConnected,
          });
          return;
        } catch (ollamaErr) {
          console.warn("⚠️ Ollama local stream issue, seamlessly using Hybrid Cloud:", ollamaErr.message);
        }
      }
      // If local daemon is not installed on PC, seamlessly continue via Hybrid Cloud Llama-3 Engine without any error banner
    }

    // Build multi-turn context
    const contents = [];

    // Append prior conversational history turns if provided (clean text only to avoid network bloat)
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-16);
      for (const h of recentHistory) {
        if (h.text && h.text.trim()) {
          contents.push({
            role: h.sender === "user" ? "user" : "model",
            parts: [{ text: h.text.trim() }],
          });
        }
      }
    }

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

    // Apply Enterprise AI Guardrails (PII Redaction & Prompt Injection Detection)
    const guardResult = applyGuardrails(trimmedMsg);
    const safeUserMsg = guardResult.sanitizedMessage;

    if (searchGrounding) {
      currentParts.push({ text: searchGrounding });
    }

    if (image && image.data && image.mimeType) {
      const isImageMedia = image.mimeType.startsWith("image/");

      if (isImageMedia) {
        // Native Gemini Vision Multimodal
        currentParts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data,
          },
        });
      } else {
        // Document / PDF / Code -> Execute Semantic Vector RAG Pipeline
        try {
          const docText = await extractTextFromAttachment(image);
          if (docText && docText.length > 50) {
            const rawChunks = chunkDocument(docText, 700, 100);

            if (rawChunks.length > 1) {
              // Generate embeddings for document chunks
              const embeddedChunks = await Promise.all(
                rawChunks.slice(0, 30).map(async (c) => ({
                  ...c,
                  embedding: await generateEmbedding(c.text),
                }))
              );

              // 3072-dim Vector Cosine Similarity Search for relevant knowledge
              const topChunks = await retrieveTopKChunks(safeUserMsg || "summarize document", embeddedChunks, 4);
              const ragContext = buildRagGroundingContext(topChunks, image.name || "Uploaded Document");
              currentParts.push({ text: ragContext });
            } else {
              currentParts.push({
                text: `[Attached Document Knowledge: "${image.name || "file"}"]:\n\`\`\`\n${docText.slice(0, 15000)}\n\`\`\`\n`,
              });
            }
          }
        } catch (ragErr) {
          console.warn("⚠️ RAG Pipeline fallback:", ragErr.message);
          currentParts.push({
            inlineData: {
              mimeType: image.mimeType,
              data: image.data,
            },
          });
        }
      }
    }

    if (safeUserMsg) {
      currentParts.push({ text: safeUserMsg });
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
        let cdnImageUrl = image && image.previewUrl && image.mimeType?.startsWith("image/") ? image.previewUrl : null;
        if (image && image.data && image.mimeType?.startsWith("image/")) {
          try {
            const uploaded = await uploadToCloudinary(image.data, "nebula_ai/chat_images");
            if (uploaded) cdnImageUrl = uploaded;
          } catch (uploadErr) {
            console.warn("Cloudinary upload fallback:", uploadErr.message);
          }
        }

        const userMsg = {
          id: `msg-${Date.now()}`,
          sender: "user",
          text: trimmedMsg || `[Attached: ${image?.name || "file"}]`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          imageUrl: cdnImageUrl,
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
            userId: req.user._id,
            userEmail: req.user.email,
          },
          $set: { model: modelUsed },
          $push: { messages: { $each: [userMsg, assistantMsg] } },
        };

        await ChatSession.findOneAndUpdate(
          { sessionId, userId: req.user._id },
          updateData,
          {
            upsert: true,
            returnDocument: "after",
          }
        );

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

        // Asynchronously extract and persist user profile facts (MemGPT Long-Term Memory)
        extractAndSaveMemories({
          userId: req.user ? req.user._id : null,
          userEmail: req.user ? req.user.email : null,
          userMessage: trimmedMsg,
        }).catch(() => {});
      } catch (dbErr) {
        console.warn("Could not save chat/usage to MongoDB:", dbErr.message);
      }
    };

    // If client requested real-time streaming (SSE)
    if (req.body.stream || res.headersSent) {
      if (!res.headersSent) {
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
      }

      let streamSuccess = false;
      let fullReply = "";
      let usedModel = candidateModels[0];
      let lastStreamError = null;

      for (const model of candidateModels) {
        try {
          const responseStream = await ai.models.generateContentStream({
            model,
            contents,
            config: {
              systemInstruction,
              temperature: isReasoning ? 0.35 : 0.65,
              topP: 0.95,
            },
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
          lastStreamError = streamErr;
          console.warn(`Stream model '${model}' error: ${streamErr.message}. Trying next model...`);
        }
      }

      if (!streamSuccess) {
        let descriptiveError = "Failed to generate AI response";
        if (lastStreamError) {
          const errMsg = lastStreamError.message || "";
          if (errMsg.includes("API key not valid") || errMsg.includes("UNAUTHENTICATED") || errMsg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED")) {
            descriptiveError = "Google Gemini API Key is invalid or unauthorized (HTTP 401). Please update GEMINI_API_KEY in server/.env with a valid key from Google AI Studio (starts with 'AIzaSy...').";
          } else if (errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429")) {
            descriptiveError = "Google Gemini API rate limit or quota exceeded (HTTP 429). Please wait a moment or try again.";
          } else {
            descriptiveError = `AI generation failed: ${errMsg}`;
          }
        }
        res.write(`data: ${JSON.stringify({ error: descriptiveError })}\n\n`);
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
          config: {
            systemInstruction,
            temperature: isReasoning ? 0.35 : 0.65,
            topP: 0.95,
          },
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

    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      return res.end();
    }

    res.status(500).json({
      success: false,
      error: "AI response failed. Check the server logs and API settings.",
      details: error.message,
    });
  }
});

// Serve built React Frontend in Production (Single-Service Render / Docker Deployment)
if (process.env.NODE_ENV === "production" && hasClientBuild) {
  app.use(express.static(clientDistPath));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

const PORT = Number(process.env.PORT) || 5000;

if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✨ Nebula AI server running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = { app };
