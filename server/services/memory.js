/**
 * Nebula AI - Persistent Long-Term Memory Service (MemGPT-inspired Architecture)
 * Automatically extracts, persists, and injects user profile facts and preferences
 * across multiple sessions so Nebula feels truly personalized and intelligent.
 */

const { Memory } = require("../models");
const { GoogleGenAI } = require("@google/genai");

let aiClient = null;
function getAi() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

/**
 * Retrieves all stored memories for a user and formats them into LLM context
 */
async function getUserMemories({ userId, userEmail }) {
  try {
    const query = [];
    if (userId) query.push({ userId });
    if (userEmail) query.push({ userEmail });
    if (query.length === 0) query.push({ userEmail: "guest@nebula.local" });

    const memories = await Memory.find({ $or: query }).sort({ updatedAt: -1 }).limit(25);
    if (!memories || memories.length === 0) {
      return { memories: [], contextString: "" };
    }

    const lines = memories.map((m) => `• [${m.category.toUpperCase()}] ${m.key}: ${m.value}`);
    const contextString =
      `\n[PERSISTENT USER MEMORY & PREFERENCES - Remembered from previous conversations]:\n` +
      lines.join("\n") +
      `\nUse this information naturally to tailor your responses without artificially reciting it unless relevant.\n\n`;

    return { memories, contextString };
  } catch (err) {
    console.warn("⚠️ Memory retrieval warning:", err.message);
    return { memories: [], contextString: "" };
  }
}

/**
 * Asynchronously extracts persistent facts from conversation turns and saves to MongoDB
 */
async function extractAndSaveMemories({ userId, userEmail, userMessage }) {
  if (!userMessage || typeof userMessage !== "string" || userMessage.length < 12) {
    return;
  }

  // Fast pre-filter for personal/self-referential intent
  const isPersonal = /\b(i am|i'm|my name|i like|i prefer|i work|i live|i build|my project|my company|my tech|my role|ഞാൻ|എന്റെ പേര്|എനിക്ക് ഇഷ്ടം|എന്റെ ജോലി|പഠിക്കുന്നത്|താമസിക്കുന്നത്)\b/i.test(userMessage);
  if (!isPersonal) return;

  const ai = getAi();
  if (!ai) return;

  try {
    const prompt = `You are a Long-Term Semantic Memory Extractor for Nebula AI.
Analyze the user's message and extract ANY permanent facts about the user (e.g. name, role, language preferences, framework choices, current projects, location, hobbies).
Ignore temporary queries like "show me weather" or "what is code".

User Message: "${userMessage}"

Respond ONLY with valid JSON array:
[{"category": "identity"|"preference"|"project"|"skill"|"fact", "key": "short_key", "value": "concise_fact"}]
If no permanent facts exist, output []`;

    const res = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
    });

    const clean = res.text.trim().replace(/^```json|```$/g, "").trim();
    const extracted = JSON.parse(clean);

    if (Array.isArray(extracted) && extracted.length > 0) {
      for (const item of extracted) {
        if (item.key && item.value) {
          await Memory.findOneAndUpdate(
            {
              $or: [
                ...(userId ? [{ userId, key: item.key.toLowerCase().trim() }] : []),
                { userEmail: userEmail || "guest@nebula.local", key: item.key.toLowerCase().trim() },
              ],
            },
            {
              $set: {
                userId: userId || null,
                userEmail: userEmail || "guest@nebula.local",
                category: item.category || "fact",
                key: item.key.toLowerCase().trim(),
                value: item.value.trim(),
                confidence: 0.95,
              },
            },
            { upsert: true, returnDocument: "after" }
          );
        }
      }
    }
  } catch (err) {
    console.warn("⚠️ Memory extraction warning:", err.message);
  }
}

module.exports = {
  getUserMemories,
  extractAndSaveMemories,
};
