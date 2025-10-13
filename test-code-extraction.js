// Test script to verify code extraction logic
// Run with: node test-code-extraction.js

const testContent = `Here's a simple counter component:

\`\`\`jsx
import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Count: {count}</h1>
      <button
        onClick={() => setCount(count + 1)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Increment
      </button>
    </div>
  );
}

export default Counter;
\`\`\`

This component demonstrates useState hook usage.`;

// Simple extraction function (mimicking the real one)
function extractCodeBlocks(content) {
  const codeBlocks = [];
  const codeBlockRegex = /```(\w+)(?:\s+(.+?))?\n([\s\S]*?)```/g;

  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const [, language, title, code] = match;
    codeBlocks.push({
      code: code.trim(),
      language,
      title: title?.trim(),
    });
  }

  return codeBlocks;
}

function isReactCode(code) {
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

function inferCodeType(language, code) {
  const lang = language.toLowerCase();

  if (lang === "jsx" || lang === "react") return "react";
  if (lang === "tsx") return "react";
  if (lang === "html") return "html";
  if (lang === "vue") return "vue";

  if (lang === "javascript" || lang === "js" || lang === "typescript" || lang === "ts") {
    if (isReactCode(code)) return "react";
    return lang === "typescript" || lang === "ts" ? "typescript" : "javascript";
  }

  return "javascript";
}

// Test extraction
console.log("Testing code extraction...\n");
console.log("Test content:\n", testContent, "\n");
console.log("=" .repeat(80));

const blocks = extractCodeBlocks(testContent);
console.log("\nExtracted blocks:", blocks.length);

for (let i = 0; i < blocks.length; i++) {
  const block = blocks[i];
  const type = inferCodeType(block.language, block.code);

  console.log(`\nBlock ${i + 1}:`);
  console.log("  Language:", block.language);
  console.log("  Inferred Type:", type);
  console.log("  Code length:", block.code.length);
  console.log("  Is React?:", isReactCode(block.code));
  console.log("  First 100 chars:", block.code.substring(0, 100));
}

const renderableTypes = ["react", "html", "vue"];
const renderableBlocks = blocks
  .map((b, i) => ({ ...b, type: inferCodeType(b.language, b.code), index: i }))
  .filter((b) => renderableTypes.includes(b.type));

console.log("\n" + "=".repeat(80));
console.log("\nRenderable blocks:", renderableBlocks.length);
if (renderableBlocks.length > 0) {
  const lastRenderable = renderableBlocks[renderableBlocks.length - 1];
  console.log("✅ Would create artifact with type:", lastRenderable.type);
  console.log("✅ Code length:", lastRenderable.code.length);
} else {
  console.log("❌ No renderable blocks found!");
}
