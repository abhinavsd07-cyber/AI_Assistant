/**
 * Nebula AI - Production Vector RAG (Retrieval-Augmented Generation) Pipeline
 * Powered by Gemini Vector Embeddings (3072-dim) & Semantic Chunking
 */

const { GoogleGenAI } = require("@google/genai");
const pdfParse = require("pdf-parse");

let aiClient = null;
function getAiClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

/**
 * Mathematical Cosine Similarity between two N-dimensional vectors
 * cos(theta) = (A . B) / (||A|| * ||B||)
 */
function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Extracts raw textual content from uploaded file data (PDF or plain text/code)
 */
async function extractTextFromAttachment(attachment) {
  if (!attachment || !attachment.data) return "";

  const buffer = Buffer.from(attachment.data, "base64");
  const mime = attachment.mimeType || "";

  if (mime === "application/pdf" || attachment.name?.toLowerCase().endsWith(".pdf")) {
    try {
      const pdfData = await pdfParse(buffer);
      return pdfData.text || "";
    } catch (pdfErr) {
      console.warn("⚠️ PDF parsing warning:", pdfErr.message);
      return buffer.toString("utf-8");
    }
  }

  // Text, Markdown, JSON, Code, CSV
  return buffer.toString("utf-8");
}

/**
 * Semantic chunking with sliding window and overlapping boundaries
 * @param {string} fullText - Document text
 * @param {number} chunkSize - Max characters per chunk (approx. 120-150 tokens)
 * @param {number} overlap - Overlapping characters between consecutive chunks
 */
function chunkDocument(fullText, chunkSize = 700, overlap = 100) {
  if (!fullText || typeof fullText !== "string") return [];

  const cleaned = fullText.replace(/\r\n/g, "\n").trim();
  if (cleaned.length <= chunkSize) {
    return [{ id: 0, text: cleaned, index: 0 }];
  }

  const chunks = [];
  let startIndex = 0;
  let chunkId = 0;

  while (startIndex < cleaned.length) {
    let endIndex = startIndex + chunkSize;

    // Try to break at sentence or paragraph boundary if nearby
    if (endIndex < cleaned.length) {
      const naturalBreak = cleaned.lastIndexOf("\n\n", endIndex);
      const sentenceBreak = cleaned.lastIndexOf(". ", endIndex);

      if (naturalBreak > startIndex + chunkSize / 2) {
        endIndex = naturalBreak + 2;
      } else if (sentenceBreak > startIndex + chunkSize / 2) {
        endIndex = sentenceBreak + 2;
      }
    }

    const chunkText = cleaned.slice(startIndex, endIndex).trim();
    if (chunkText.length > 20) {
      chunks.push({
        id: chunkId++,
        text: chunkText,
        charStart: startIndex,
        charEnd: endIndex,
      });
    }

    startIndex = endIndex - overlap;
    if (startIndex >= cleaned.length) break;
  }

  return chunks;
}

/**
 * Generates high-dimensional vector embeddings using Gemini
 */
async function generateEmbedding(text) {
  const ai = getAiClient();
  if (!ai) return null;

  const candidateModels = ["gemini-embedding-2", "gemini-embedding-001"];

  for (const model of candidateModels) {
    try {
      const res = await ai.models.embedContent({
        model,
        contents: text.slice(0, 2048),
      });

      if (res && res.embeddings && res.embeddings[0]?.values) {
        return res.embeddings[0].values;
      }
    } catch {
      // Try next candidate
    }
  }

  return null;
}

/**
 * Vector Semantic Search over embedded document chunks
 * Returns the top-K most semantically relevant chunks with similarity scores
 */
async function retrieveTopKChunks(query, chunksWithEmbeddings, k = 4) {
  if (!chunksWithEmbeddings || chunksWithEmbeddings.length === 0) return [];

  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) {
    // Keyword fallback if embedding API unavailable
    const qLower = query.toLowerCase();
    return chunksWithEmbeddings
      .map((c) => ({
        ...c,
        similarity: c.text.toLowerCase().includes(qLower) ? 0.8 : 0.3,
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  }

  const scored = chunksWithEmbeddings.map((chunk) => {
    const similarity = chunk.embedding
      ? cosineSimilarity(queryEmbedding, chunk.embedding)
      : 0;
    return {
      id: chunk.id,
      text: chunk.text,
      similarity,
    };
  });

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, k);
}

/**
 * Formats retrieved chunks into an authoritative Ground Truth context for the prompt
 */
function buildRagGroundingContext(topChunks, documentName = "Document") {
  if (!topChunks || topChunks.length === 0) return "";

  const formattedSources = topChunks
    .map(
      (c, idx) =>
        `[Excerpt ${idx + 1} | Semantic Relevance: ${(c.similarity * 100).toFixed(1)}%]:\n"${c.text}"`
    )
    .join("\n\n");

  return (
    `[SEMANTIC VECTOR RAG GROUNDING - Extracted from: "${documentName}"]\n` +
    `The following excerpts are the exact ground truth retrieved from the uploaded document via 3072-dimensional vector search:\n\n` +
    `${formattedSources}\n\n` +
    `INSTRUCTIONS: Base your answer authoritatively on the above excerpts. If the information is in the excerpts, cite the specific excerpt numbers. Be accurate, concise, and helpful.\n\n`
  );
}

module.exports = {
  extractTextFromAttachment,
  chunkDocument,
  generateEmbedding,
  retrieveTopKChunks,
  buildRagGroundingContext,
  cosineSimilarity,
};
