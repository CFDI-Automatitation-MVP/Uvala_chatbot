import "server-only";

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import globalLogger from "logger";
import { colorize } from "consola/utils";

const logger = globalLogger.withDefaults({
  message: colorize("cyanBright", `Document Preprocessor: `),
});

export interface DocumentAnalysis {
  filename: string;
  type: "pdf" | "document" | "unknown";
  analysis: string;
  tokensUsed: number;
  processingTimeMs: number;
  model: string;
}

export interface DocumentPreprocessResult {
  contextString: string;
  analyses: DocumentAnalysis[];
  totalTokens: number;
  totalCost: number;
}

/**
 * Analyzes a document using GPT-5 mini (same model as Chat Mode / uvala-fuji)
 * Extracts text content and provides educational summary
 */
async function analyzeDocument(
  documentUrl: string,
  filename: string,
  mediaType: string,
): Promise<DocumentAnalysis> {
  const startTime = Date.now();

  try {
    logger.info(`📄 Analyzing document with GPT-5 mini: ${filename}`);

    // Extract base64 content from data URL
    const dataUrlMatch = documentUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!dataUrlMatch) {
      throw new Error("Invalid data URL format");
    }

    const [, , base64Data] = dataUrlMatch;
    const buffer = Buffer.from(base64Data, "base64");
    const textContent = buffer.toString("utf-8");

    // Limit content to avoid token limits (~200K characters = ~50K tokens)
    const contentToAnalyze = textContent.substring(0, 200000);

    const result = await generateText({
      model: openai("gpt-5-mini-2025-08-07"), // Same as Chat Mode (uvala-fuji)
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are helping a tutor AI understand a document for educational purposes.

**Your Task:** Extract and summarize the key educational content from this document.

**Provide:**
1. **Summary:** Overview of main topics and purpose (2-3 paragraphs)
2. **Key Topics:** List main subjects, concepts covered
3. **Important Details:** Key facts, formulas, definitions
4. **Learning Context:** What students typically learn from this

**Be concise but thorough.** Focus on educational value.

---

**Document:** ${filename}

**Content:**
${contentToAnalyze}`,
            },
          ],
        },
      ],
      maxOutputTokens: 1000, // Allow detailed analysis
      temperature: 0.1, // Deterministic
      topP: 0.9,
    });

    const processingTimeMs = Date.now() - startTime;

    // Calculate cost: GPT-5 mini pricing
    const inputTokens = result.usage?.inputTokens || 0;
    const outputTokens = result.usage?.outputTokens || 0;
    const totalTokens = result.usage?.totalTokens || 0;
    const inputCost = (inputTokens / 1_000_000) * 0.25; // $0.25/1M input
    const outputCost = (outputTokens / 1_000_000) * 2.0; // $2.00/1M output
    const totalCost = inputCost + outputCost;

    logger.info(
      `✅ Document analyzed in ${processingTimeMs}ms (${totalTokens} tokens, $${totalCost.toFixed(6)})`,
    );

    return {
      filename,
      type: mediaType === "application/pdf" ? "pdf" : "document",
      analysis: result.text,
      tokensUsed: totalTokens,
      processingTimeMs,
      model: "gpt-5-mini-2025-08-07",
    };
  } catch (error: any) {
    logger.error(`❌ Failed to analyze document ${filename}:`, error.message);

    // Fallback: return basic info without analysis
    return {
      filename,
      type: "unknown",
      analysis: `[Document uploaded: ${filename} - Analysis temporarily unavailable. Please describe what you'd like to learn from this document.]`,
      tokensUsed: 0,
      processingTimeMs: Date.now() - startTime,
      model: "gpt-5-mini-2025-08-07",
    };
  }
}

/**
 * Preprocesses document attachments for Learn Mode
 *
 * SIMILAR TO VISION PREPROCESSING:
 * - Uses GPT-5 mini (same as Chat Mode) to analyze PDFs and documents
 * - Extracts key educational content
 * - Returns formatted context string to inject into conversation
 *
 * @param documentParts - Document file parts from message
 * @returns Preprocessing result with context string and usage stats
 */
export async function preprocessDocumentAttachments(
  documentParts: Array<{
    type: string;
    url?: string;
    name?: string;
    filename?: string;
    mediaType?: string;
  }>,
): Promise<DocumentPreprocessResult> {
  if (!documentParts || documentParts.length === 0) {
    return {
      contextString: "",
      analyses: [],
      totalTokens: 0,
      totalCost: 0,
    };
  }

  logger.info(
    `📎 Processing ${documentParts.length} document(s) with GPT-5 mini preprocessing`,
  );

  // Process all documents in parallel for speed
  const analyses = await Promise.all(
    documentParts.map(async (docPart) => {
      const filename = docPart.filename || docPart.name || "unknown.pdf";
      const url = docPart.url || "";
      const mediaType = docPart.mediaType || "application/pdf";

      return await analyzeDocument(url, filename, mediaType);
    }),
  );

  // Format context string for injection into user message
  const contextString = analyses
    .map((analysis) => {
      const icon = analysis.type === "pdf" ? "📄" : "📝";
      return `${icon} **Document Analysis: ${analysis.filename}**\n\n${analysis.analysis}`;
    })
    .join("\n\n---\n\n");

  const totalTokens = analyses.reduce((sum, a) => sum + a.tokensUsed, 0);

  // Calculate total cost: GPT-5 mini pricing
  const totalCost = analyses.reduce((sum, analysis) => {
    if (analysis.tokensUsed > 0) {
      // GPT-5 mini: $0.25/1M input, $2.00/1M output
      // Approximate split based on actual usage
      const inputTokens = Math.floor(analysis.tokensUsed * 0.95); // Most tokens are input
      const outputTokens = analysis.tokensUsed - inputTokens;
      const cost =
        (inputTokens / 1_000_000) * 0.25 + (outputTokens / 1_000_000) * 2.0;
      return sum + cost;
    }
    return sum;
  }, 0);

  logger.info(
    `✅ Document preprocessing complete: ${totalTokens} tokens used, $${totalCost.toFixed(6)} total cost`,
  );

  return {
    contextString,
    analyses,
    totalTokens,
    totalCost,
  };
}

/**
 * Helper function to check if a message has document attachments
 */
export function hasDocumentAttachments(
  message: { parts?: Array<{ type: string; mediaType?: string }> } | undefined,
): boolean {
  if (!message?.parts) return false;
  return message.parts.some(
    (part) => part.type === "file" && !part.mediaType?.startsWith("image/"),
  );
}
