export type CodeType = "react" | "html" | "vue" | "javascript" | "typescript";

export interface ExtractedCode {
  code: string;
  type: CodeType;
  language: string;
  title?: string;
}

/**
 * Extracts code blocks from markdown content
 * Handles both complete (```...```) and incomplete (```... with no closing) code blocks
 */
export function extractCodeBlocks(content: string): ExtractedCode[] {
  const codeBlocks: ExtractedCode[] = [];

  // First, try to match complete code blocks
  const completeRegex = /```(\w+)(?:\s+(.+?))?\n([\s\S]*?)```/g;

  let match;
  const matchedRanges: Array<{ start: number; end: number }> = [];

  while ((match = completeRegex.exec(content)) !== null) {
    const [fullMatch, language, title, code] = match;
    const type = inferCodeType(language, code);

    codeBlocks.push({
      code: code.trim(),
      type,
      language,
      title: title?.trim(),
    });

    // Track matched ranges to avoid duplicates
    matchedRanges.push({
      start: match.index,
      end: match.index + fullMatch.length,
    });
  }

  // Then, try to match incomplete code blocks (missing closing ```)
  // This handles cases where context limit cuts off the response
  const incompleteRegex = /```(\w+)(?:\s+(.+?))?\n([\s\S]+?)$/g;

  while ((match = incompleteRegex.exec(content)) !== null) {
    const [fullMatch, language, title, code] = match;

    // Skip if this range overlaps with a complete match
    const isOverlapping = matchedRanges.some(
      (range) => match.index >= range.start && match.index < range.end
    );

    if (isOverlapping) continue;

    const type = inferCodeType(language, code);

    console.log("[CODE EXTRACTION] Found incomplete code block:", {
      language,
      type,
      codeLength: code.length,
      note: "Missing closing backticks - likely truncated by context limit"
    });

    // Clean up title - don't use DOCTYPE or other HTML artifacts
    let cleanTitle = title?.trim() || "Truncated Component";
    if (cleanTitle.includes("DOCTYPE") || cleanTitle.includes("html>")) {
      cleanTitle = "Generated Component";
    }

    codeBlocks.push({
      code: code.trim(),
      type,
      language,
      title: cleanTitle,
    });
  }

  return codeBlocks;
}

/**
 * Infers the code type from language and content
 */
function inferCodeType(language: string, code: string): CodeType {
  const lang = language.toLowerCase();

  // Explicit language mappings
  if (lang === "jsx" || lang === "react") return "react";
  if (lang === "tsx") return "react";
  if (lang === "html") return "html";
  if (lang === "vue") return "vue";

  // Check for React patterns in JavaScript/TypeScript
  if (lang === "javascript" || lang === "js" || lang === "typescript" || lang === "ts") {
    if (isReactCode(code)) return "react";
    return lang === "typescript" || lang === "ts" ? "typescript" : "javascript";
  }

  return "javascript";
}

/**
 * Checks if code contains React patterns
 */
function isReactCode(code: string): boolean {
  const reactPatterns = [
    /import\s+(?:React|\{[^}]*\})\s+from\s+['"]react['"]/,
    /import.*from\s+['"]react['"]/,
    /<[A-Z]\w*[\s>]/, // JSX component tags
    /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\(?\s*</,
    /function\s+\w+\s*\([^)]*\)\s*\{[^}]*return\s*\(?\s*</,
    /useState|useEffect|useCallback|useMemo|useRef/,
  ];

  return reactPatterns.some((pattern) => pattern.test(code));
}

/**
 * Finds the most recent renderable code block from a message
 */
export function findRenderableCode(content: string): ExtractedCode | null {
  console.log("[CODE EXTRACTION] ======== Starting Extraction ========");
  console.log("[CODE EXTRACTION] Content length:", content.length);
  console.log("[CODE EXTRACTION] Content preview:", content.substring(0, 200));

  // Check for code block markers
  const hasOpeningMarker = content.includes("```");
  console.log("[CODE EXTRACTION] Has ``` marker:", hasOpeningMarker);

  if (hasOpeningMarker) {
    const matches = content.match(/```(\w+)/g);
    console.log("[CODE EXTRACTION] Code block openers found:", matches);
  }

  const codeBlocks = extractCodeBlocks(content);
  console.log("[CODE EXTRACTION] Total code blocks extracted:", codeBlocks.length);

  if (codeBlocks.length > 0) {
    console.log(
      "[CODE EXTRACTION] Code blocks details:",
      codeBlocks.map((b) => ({
        lang: b.language,
        type: b.type,
        len: b.code.length,
        title: b.title,
        preview: b.code.substring(0, 100)
      })),
    );
  }

  // Filter to only renderable types
  const renderableBlocks = codeBlocks.filter(
    (block) =>
      block.type === "react" || block.type === "html" || block.type === "vue",
  );

  console.log("[CODE EXTRACTION] Renderable blocks found:", renderableBlocks.length);

  // Return the last renderable block
  const result = renderableBlocks[renderableBlocks.length - 1] || null;

  if (result) {
    console.log("[CODE EXTRACTION] ✅ SUCCESS - Returning:", {
      type: result.type,
      length: result.code.length,
      title: result.title
    });
  } else {
    console.log("[CODE EXTRACTION] ❌ FAILED - No renderable code found");
  }

  console.log("[CODE EXTRACTION] ======== Extraction Complete ========");

  return result;
}

/**
 * Extracts artifact metadata from content
 * Looks for special comments like: // @artifact-title: My Component
 */
export function extractArtifactMetadata(content: string): {
  title?: string;
  description?: string;
} {
  const titleMatch = content.match(/\/\/\s*@artifact-title:\s*(.+)/);
  const descMatch = content.match(/\/\/\s*@artifact-description:\s*(.+)/);

  return {
    title: titleMatch?.[1]?.trim(),
    description: descMatch?.[1]?.trim(),
  };
}

/**
 * Cleans up code for rendering by removing imports and exports
 */
export function cleanCodeForSandbox(code: string, type: CodeType): string {
  let cleaned = code;

  if (type === "react") {
    // Remove import statements (we provide these in the sandbox)
    cleaned = cleaned.replace(/import\s+.*?from\s+['"].*?['"];?\n?/g, "");

    // Remove export statements but keep the code
    cleaned = cleaned.replace(/export\s+default\s+/g, "");
    cleaned = cleaned.replace(/export\s+/g, "");
  }

  return cleaned.trim();
}
