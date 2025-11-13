/**
 * Extracts thinking content from AI responses
 * This is a simple implementation that can be enhanced based on your needs
 */
export function extractThinking(text: string): {
  hasThinking: boolean;
  thinking: string;
  content: string;
} {
  // Look for thinking tags or markers (using [\s\S] instead of . with s flag)
  const thinkingMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/);
  if (thinkingMatch) {
    const thinking = thinkingMatch[1].trim();
    const content = text.replace(/<thinking>[\s\S]*?<\/thinking>/, "").trim();
    return { hasThinking: true, thinking, content };
  }

  // Look for other thinking patterns
  const thoughtMatch = text.match(/\[Thinking:([\s\S]*?)\]/);
  if (thoughtMatch) {
    const thinking = thoughtMatch[1].trim();
    const content = text.replace(/\[Thinking:[\s\S]*?\]/, "").trim();
    return { hasThinking: true, thinking, content };
  }

  return { hasThinking: false, thinking: "", content: text };
}
