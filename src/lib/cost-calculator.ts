// Cost calculation utilities for subscription limits

// GPT-5-mini pricing (per 1M tokens)
export const GPT5_MINI_PRICING = {
  INPUT_PER_1M: 0.25, // $0.25 per 1M input tokens
  OUTPUT_PER_1M: 2.0, // $2.00 per 1M output tokens
  CACHED_INPUT_PER_1M: 0.025, // $0.025 per 1M cached input tokens
};

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
}

export interface ToolUsage {
  imageGenerations: number;
  videoGenerations: number;
  webSearches: number;
}

/**
 * Calculate cost for LLM token usage
 */
export function calculateLLMCost(usage: TokenUsage): number {
  const inputCost =
    (usage.inputTokens / 1_000_000) * GPT5_MINI_PRICING.INPUT_PER_1M;
  const outputCost =
    (usage.outputTokens / 1_000_000) * GPT5_MINI_PRICING.OUTPUT_PER_1M;
  const cachedInputCost =
    ((usage.cachedInputTokens || 0) / 1_000_000) *
    GPT5_MINI_PRICING.CACHED_INPUT_PER_1M;

  return inputCost + outputCost + cachedInputCost;
}

/**
 * Estimate tool costs (approximate)
 */
export function calculateToolCosts(usage: ToolUsage): number {
  const imageCost = usage.imageGenerations * 0.004; // ~$0.004 per image
  const videoCost = usage.videoGenerations * 0.02; // ~$0.02 per video
  const searchCost = usage.webSearches * 0.002; // ~$0.002 per search

  return imageCost + videoCost + searchCost;
}

/**
 * Calculate total daily/monthly costs
 */
export function calculateTotalCost(
  llmUsage: TokenUsage,
  toolUsage: ToolUsage,
): number {
  return calculateLLMCost(llmUsage) + calculateToolCosts(toolUsage);
}

/**
 * Estimate message cost (for pre-request checking)
 */
export function estimateMessageCost(
  inputTokens: number,
  outputTokens: number,
  hasCachedSystemPrompt: boolean = true,
): number {
  const systemPromptTokens = 1200; // Approximate system prompt size
  const _cachedSystemPromptCost = hasCachedSystemPrompt
    ? (systemPromptTokens / 1_000_000) * GPT5_MINI_PRICING.CACHED_INPUT_PER_1M
    : (systemPromptTokens / 1_000_000) * GPT5_MINI_PRICING.INPUT_PER_1M;

  return calculateLLMCost({
    inputTokens: inputTokens,
    outputTokens: outputTokens,
    cachedInputTokens: hasCachedSystemPrompt ? systemPromptTokens : 0,
  });
}

/**
 * Check if estimated cost would exceed daily limit
 */
export function wouldExceedDailyLimit(
  currentDailyCost: number,
  estimatedMessageCost: number,
  dailyLimit: number,
): boolean {
  return currentDailyCost + estimatedMessageCost > dailyLimit;
}

/**
 * Check if estimated cost would exceed monthly limit
 */
export function wouldExceedMonthlyLimit(
  currentMonthlyCost: number,
  estimatedMessageCost: number,
  monthlyLimit: number,
): boolean {
  return currentMonthlyCost + estimatedMessageCost > monthlyLimit;
}
