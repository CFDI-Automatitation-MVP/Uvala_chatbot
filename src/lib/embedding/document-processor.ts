import {
  generateEmbeddingsBatch,
  estimateTokenCount,
} from "./openai-embeddings";

export interface DocumentChunk {
  content: string;
  chunkIndex: number;
  startChar: number;
  endChar: number;
  tokenCount: number;
}

export interface ProcessedDocument {
  chunks: DocumentChunk[];
  totalChunks: number;
  totalTokens: number;
  extractedText: string;
}

export interface ChunkingOptions {
  chunkSize: number; // Target chunk size in tokens
  chunkOverlap: number; // Overlap between chunks in tokens
  preserveParagraphs: boolean; // Try to keep paragraphs intact
  minChunkSize: number; // Minimum chunk size in tokens
}

// Universal PDF chunking strategy based on 2024 RAG best practices
export const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  chunkSize: 400, // Optimal for most RAG use cases (256-512 tokens)
  chunkOverlap: 80, // 20% overlap for context preservation
  preserveParagraphs: false, // Use aggressive sentence-based chunking for PDFs
  minChunkSize: 100, // Minimum for semantic meaning
};

/**
 * Extract text content from different file types
 */
export async function extractTextFromFile(
  file: File,
  contentType: string,
): Promise<string> {
  switch (contentType) {
    case "text/plain":
    case "text/markdown":
    case "text/csv":
    case "application/json":
      return await file.text();

    case "application/pdf":
      try {
        // Use unpdf for modern, reliable PDF text extraction
        const { extractText, getDocumentProxy } = await import("unpdf");

        // Convert File to ArrayBuffer then Uint8Array for unpdf
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Get PDF document proxy
        const pdf = await getDocumentProxy(uint8Array);

        // Extract text from all pages
        const { totalPages, text } = await extractText(pdf, {
          mergePages: true,
        });

        if (!text || text.trim().length === 0) {
          throw new Error(
            `No text content found in PDF (${totalPages} pages). The PDF might be image-based or corrupted.`,
          );
        }

        // Clean up the extracted text
        const cleanedText = text
          .replace(/\s+/g, " ") // Replace multiple whitespace with single space
          .replace(/\n\s*\n/g, "\n\n") // Preserve paragraph breaks
          .trim();

        console.log(
          `✅ PDF processed: ${totalPages} pages, ${cleanedText.length} characters extracted`,
        );
        return cleanedText;
      } catch (pdfError) {
        console.error("PDF processing error:", pdfError);
        if (pdfError instanceof Error) {
          throw new Error(`PDF processing failed: ${pdfError.message}`);
        }
        throw new Error("PDF processing failed: Unknown error");
      }

    case "application/msword":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      // For Word docs, you'd use libraries like mammoth.js
      throw new Error(
        "Word document processing not yet implemented. Please convert to text format.",
      );

    default:
      throw new Error(`Unsupported file type: ${contentType}`);
  }
}

/**
 * Split text into sentences for better chunking boundaries
 * Uses robust sentence detection for PDFs and various text formats
 */
function splitIntoSentences(text: string): string[] {
  // Simple but effective sentence splitting for PDFs
  // Split on periods, exclamation marks, and question marks followed by whitespace or newlines
  let sentences = text
    .split(/[.!?]+\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // If we get very few sentences, the text might not have proper punctuation
  // Fall back to splitting on newlines and other delimiters
  if (sentences.length < 3) {
    sentences = text
      .split(/[\n\r]+/)
      .flatMap((line) => {
        // Split long lines on multiple delimiters
        if (line.length > 500) {
          return line
            .split(/[.!?;:]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        }
        return [line.trim()];
      })
      .filter((s) => s.length > 20); // Longer minimum for fallback splitting
  }

  return sentences;
}

/**
 * Universal PDF chunking strategy for RAG systems (2024 best practices)
 * Uses sentence-based chunking with intelligent overlap
 */
export function chunkText(
  text: string,
  options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS,
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  // Universal strategy: Split by sentences for better semantic boundaries
  const sentences = splitIntoSentences(text);
  let currentChunk = "";
  let currentStartChar = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const testChunk = currentChunk ? currentChunk + " " + sentence : sentence;
    const testTokens = estimateTokenCount(testChunk);

    // If adding this sentence would exceed chunk size and we have content
    if (testTokens > options.chunkSize && currentChunk.length > 0) {
      // Create chunk from current content
      const currentTokens = estimateTokenCount(currentChunk);
      if (currentTokens >= options.minChunkSize) {
        const currentEndChar = currentStartChar + currentChunk.length;
        chunks.push({
          content: currentChunk.trim(),
          chunkIndex: chunkIndex++,
          startChar: currentStartChar,
          endChar: currentEndChar,
          tokenCount: currentTokens,
        });

        // Start new chunk with overlap (include last few sentences)
        const overlapSentences = getOverlapSentences(
          sentences,
          i,
          options.chunkOverlap,
        );
        const overlapText = overlapSentences.join(" ");
        currentChunk =
          overlapText + (overlapText.length > 0 ? " " : "") + sentence;
        // Calculate proper start position for the new chunk
        currentStartChar =
          currentEndChar -
          overlapText.length -
          (overlapText.length > 0 ? 1 : 0);
      } else {
        // If current chunk is too small, just add the sentence
        currentChunk = testChunk;
      }
    } else {
      // Add sentence to current chunk
      currentChunk = testChunk;
    }
  }

  // Add final chunk
  if (currentChunk.trim().length > 0) {
    const currentTokens = estimateTokenCount(currentChunk);
    if (currentTokens >= options.minChunkSize) {
      chunks.push({
        content: currentChunk.trim(),
        chunkIndex: chunkIndex++,
        startChar: currentStartChar,
        endChar: currentStartChar + currentChunk.length,
        tokenCount: currentTokens,
      });
    }
  }

  // Safety check: ensure no chunk exceeds safe token limits
  const safeChunks = chunks.map((chunk) => {
    const estimatedTokens = estimateTokenCount(chunk.content);
    if (estimatedTokens > 7500) {
      // Conservative limit
      console.warn(
        `Chunk ${chunk.chunkIndex} too large (${estimatedTokens} tokens), truncating...`,
      );
      const truncatedContent = chunk.content.substring(
        0,
        Math.floor(chunk.content.length * 0.7),
      );
      return {
        ...chunk,
        content: truncatedContent,
        tokenCount: estimateTokenCount(truncatedContent),
        endChar: chunk.startChar + truncatedContent.length,
      };
    }
    return chunk;
  });

  return safeChunks;
}

/**
 * Get overlap sentences from previous chunks for context preservation
 */
function getOverlapSentences(
  sentences: string[],
  currentIndex: number,
  overlapTokens: number,
): string[] {
  if (overlapTokens <= 0 || currentIndex === 0) return [];

  const overlapSentences: string[] = [];
  let tokenCount = 0;

  // Work backwards from the current position to collect sentences for overlap
  for (let i = currentIndex - 1; i >= 0; i--) {
    const sentence = sentences[i];
    const sentenceTokens = estimateTokenCount(sentence);

    // Stop if adding this sentence would exceed the overlap budget
    if (tokenCount + sentenceTokens > overlapTokens) {
      break;
    }

    overlapSentences.unshift(sentence); // Add to beginning to maintain order
    tokenCount += sentenceTokens;
  }

  return overlapSentences;
}

/**
 * Process a document: extract text, chunk it, and prepare for embedding
 */
export async function processDocument(
  file: File,
  contentType: string,
  options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS,
): Promise<ProcessedDocument> {
  // Extract text from file
  const extractedText = await extractTextFromFile(file, contentType);

  if (!extractedText.trim()) {
    throw new Error("No text content found in file");
  }

  // Chunk the text
  const chunks = chunkText(extractedText, options);

  if (chunks.length === 0) {
    throw new Error("No valid chunks created from document");
  }

  const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);

  return {
    chunks,
    totalChunks: chunks.length,
    totalTokens,
    extractedText,
  };
}

/**
 * Generate embeddings for all chunks in a document
 */
export async function generateDocumentEmbeddings(
  chunks: DocumentChunk[],
): Promise<Array<{ chunk: DocumentChunk; embedding: number[] }>> {
  const texts = chunks.map((chunk) => chunk.content);
  const batchResult = await generateEmbeddingsBatch(texts);

  return chunks.map((chunk, index) => ({
    chunk,
    embedding: batchResult.embeddings[index].embedding,
  }));
}
