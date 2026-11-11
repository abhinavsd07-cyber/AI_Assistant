/**
 * Nebula AI - Ollama Local Engine Service
 * Provides offline local LLM execution (Llama 3, Mistral, DeepSeek, Gemma, Phi-3),
 * live daemon detection, streaming SSE responses, and seamless cloud failover.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

/**
 * Checks if Ollama daemon is running locally and retrieves installed local models
 * @returns {Promise<{ isRunning: boolean, host: string, models: Array<any>, error?: string }>}
 */
async function checkOllamaStatus() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        isRunning: true,
        host: OLLAMA_HOST,
        models: Array.isArray(data.models) ? data.models : [],
      };
    }
    return {
      isRunning: false,
      host: OLLAMA_HOST,
      models: [],
      error: `Ollama returned status ${res.status}`,
    };
  } catch (err) {
    return {
      isRunning: false,
      host: OLLAMA_HOST,
      models: [],
      error: err.name === "AbortError" ? "Connection timed out" : "Ollama daemon not running",
    };
  }
}

/**
 * Streams chat responses from local Ollama instance via SSE
 */
async function streamOllamaChat({
  modelName = "llama3",
  systemInstruction,
  history = [],
  message,
  res,
  sessionId,
  ChatSession,
  req,
  isMongoConnected,
}) {
  const cleanModel = modelName.replace(/^ollama:/i, "").trim() || "llama3";

  // Build message sequence for Ollama /api/chat
  const messages = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }

  if (Array.isArray(history) && history.length > 0) {
    for (const h of history.slice(-8)) {
      if (h.text && h.text.trim()) {
        messages.push({
          role: h.sender === "user" ? "user" : "assistant",
          content: h.text.trim(),
        });
      }
    }
  }

  messages.push({ role: "user", content: message });

  try {
    const controller = new AbortController();
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cleanModel,
        messages,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed);
          const chunk = parsed.message?.content || "";
          if (chunk) {
            fullText += chunk;
            res.write(`data: ${JSON.stringify({ chunk, fullText })}\n\n`);
          }
          if (parsed.done) {
            res.write(`data: ${JSON.stringify({ done: true, model: `ollama:${cleanModel}` })}\n\n`);
          }
        } catch (jsonErr) {
          // ignore non-json chunk
        }
      }
    }

    res.end();

    // Persist to MongoDB in background
    if (isMongoConnected && sessionId && fullText) {
      const userMsg = {
        id: `msg-${Date.now()}`,
        sender: "user",
        text: message,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const assistantMsg = {
        id: `msg-${Date.now() + 1}`,
        sender: "assistant",
        text: fullText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      await ChatSession.findOneAndUpdate(
        { sessionId },
        {
          $setOnInsert: {
            title: message.slice(0, 30),
            userId: req.user ? req.user._id : null,
            userEmail: req.user ? req.user.email : null,
          },
          $set: { model: `ollama:${cleanModel}` },
          $push: { messages: { $each: [userMsg, assistantMsg] } },
        },
        { upsert: true, new: true }
      ).catch(() => {});
    }

    return { success: true, fullText };
  } catch (err) {
    console.warn("⚠️ Ollama streaming error:", err.message);
    throw err;
  }
}

module.exports = {
  OLLAMA_HOST,
  checkOllamaStatus,
  streamOllamaChat,
};
