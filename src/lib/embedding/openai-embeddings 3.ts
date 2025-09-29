import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
  cost: number;
}

export interface EmbeddingBatchResult {
  embeddings: Array<{
    embedding: number[];
    index: number;
  }>;
  totalTokens: number;
  totalCost: number;
}

// OpenAI text-embedding-3-small pricing: $0.02 per 1M tokens
const EMBEDDING_COST_PER_TOKEN = 0.00000002; // $0.02 / 1,000,000

/**
 * Generate embedding for a single text using OpenAI text-embedding-3-small
 */
export async function generateEmbedding(
  text: string,
): Promise<EmbeddingResult> {
  if (!text.trim()) {
    throw new Error("Text cannot be empty for embedding generation");
  }

  try {
    const result = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: text,
    });

    const embedding = result.embedding;
    if (!embedding) {
      throw new Error("No embedding returned from OpenAI");
    }

    const tokens = result.usage?.tokens || 0;
    const cost = tokens * EMBEDDING_COST_PER_TOKEN;

    return {
      embedding,
      tokens,
      cost,
    };
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Generate embeddings for multiple texts in a single batch
 * More efficient for processing multiple chunks
 */
export async function generateEmbeddingsBatch(
  texts: string[],
): Promise<EmbeddingBatchResult> {
  if (texts.length === 0) {
    throw new Error("No texts provided for batch embedding generation");
  }

  // Filter out empty texts
  const validTexts = texts.filter((text) => text.trim().length > 0);
  if (validTexts.length === 0) {
    throw new Error("No valid texts provided for embedding generation");
  }

  try {
    // Check and truncate texts that exceed token limits before processing
    const processedTexts = validTexts.map((text, index) => {
      if (isTextTooLong(text)) {
        console.warn(
          `Text chunk ${index} too long (${estimateTokenCount(text)} tokens), truncating...`,
        );
        return truncateTextForEmbedding(text);
      }
      return text;
    });

    // For batch processing, we'll call embed for each text
    // The AI SDK doesn't have native batch support for embeddings yet
    const results = await Promise.all(
      processedTexts.map(async (text, index) => {
        const result = await embed({
          model: openai.embedding("text-embedding-3-small"),
          value: text,
        });
        return {
          embedding: result.embedding,
          index,
          tokens: result.usage?.tokens || 0,
        };
      }),
    );

    const embeddings = results.map((result) => ({
      embedding: result.embedding,
      index: result.index,
    }));

    const totalTokens = results.reduce((sum, result) => sum + result.tokens, 0);
    const totalCost = totalTokens * EMBEDDING_COST_PER_TOKEN;

    return {
      embeddings,
      totalTokens,
      totalCost,
    };
  } catch (error) {
    console.error("Error generating batch embeddings:", error);
    throw new Error(
      `Failed to generate batch embeddings: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Estimate token count for text (rough approximation)
 * OpenAI's tokenizer is complex, but this gives a reasonable estimate
 * Using conservative estimation to avoid exceeding limits
 */
export function estimateTokenCount(text: string): number {
  // Conservative estimation: ~3 characters per token (safer than 4)
  // This accounts for longer tokens and special characters
  return Math.ceil(text.length / 3);
}

/**
 * Estimate cost for embedding generation
 */
export function estimateEmbeddingCost(tokenCount: number): number {
  return tokenCount * EMBEDDING_COST_PER_TOKEN;
}

/**
 * Check if text is too long for embedding
 * OpenAI text-embedding-3-small has a max of 8192 tokens
 */
export function isTextTooLong(text: string): boolean {
  const estimatedTokens = estimateTokenCount(text);
  return estimatedTokens > 8192;
}

/**
 * Truncate text to fit within token limits
 */
export function truncateTextForEmbedding(
  text: string,
  maxTokens: number = 7500,
): string {
  const estimatedTokens = estimateTokenCount(text);

  if (estimatedTokens <= maxTokens) {
    return text;
  }

  // Truncate to approximately fit within token limit with safety margin
  const maxChars = maxTokens * 3; // Conservative conversion back to characters
  const truncated = text.substring(0, maxChars);

  // Try to truncate at a sentence boundary to maintain coherence
  const lastSentence = truncated.lastIndexOf(".");
  const lastNewline = truncated.lastIndexOf("\n");
  const cutPoint = Math.max(lastSentence, lastNewline);

  if (cutPoint > maxChars * 0.8) {
    // Only use sentence boundary if it's not too short
    return truncated.substring(0, cutPoint + 1);
  }

  return truncated;
}
