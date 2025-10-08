import { LanguageModelUsage } from "ai";

// Model pricing in USD per 1M tokens
export const MODEL_PRICING = {
  // OpenAI GPT-5 models
  "openai/gpt-5": {
    input: 0.25,
    output: 2.0,
    cachedInput: 0.025,
    reasoning: 2.0, // Same as output for reasoning tokens
  },
  "openai/gpt-5-mini": {
    input: 0.25,
    output: 2.0,
    cachedInput: 0.025,
    reasoning: 2.0,
  },
  "openai/gpt-5-nano": {
    input: 0.05,
    output: 0.4,
    cachedInput: 0.005,
    reasoning: 0.4,
  },

  // OpenAI GPT-4.1 models
  "openai/gpt-4.1": {
    input: 0.25,
    output: 2.0,
    cachedInput: 0.025,
    reasoning: 2.0,
  },
  "openai/gpt-4.1-mini": {
    input: 0.25,
    output: 2.0,
    cachedInput: 0.025,
    reasoning: 2.0,
  },

  // OpenAI O-series models
  "openai/o3": {
    input: 0.25,
    output: 2.0,
    cachedInput: 0.025,
    reasoning: 2.0,
  },
  "openai/o4-mini": {
    input: 0.25,
    output: 2.0,
    cachedInput: 0.025,
    reasoning: 2.0,
  },

  // Fireworks AI
  "fireworks/gpt-oss-120b": {
    input: 0.15,
    output: 0.6,
    cachedInput: 0.15, // No separate cached pricing mentioned
    reasoning: 0.6,
  },

  // Internal models
  "Internal/qwen3-coder-30b": {
    input: 0.15, // $0.15 per 1M input tokens (Fireworks pricing)
    output: 0.6, // $0.60 per 1M output tokens (Fireworks pricing)
    cachedInput: 0.15,
    reasoning: 0.6,
  },

  // Google Gemini models (estimated based on typical pricing)
  "google/gemini-2.5-flash": {
    input: 0.075,
    output: 0.3,
    cachedInput: 0.0375,
    reasoning: 0.3,
  },
  "google/gemini-2.5-flash-lite": {
    input: 0.075,
    output: 0.3,
    cachedInput: 0.0375,
    reasoning: 0.3,
  },
  "google/gemini-2.5-pro": {
    input: 3.5,
    output: 10.5,
    cachedInput: 0.875,
    reasoning: 10.5,
  },

  // Anthropic Claude models (estimated)
  "anthropic/claude-4-sonnet": {
    input: 3.0,
    output: 15.0,
    cachedInput: 0.3,
    reasoning: 15.0,
  },
  "anthropic/claude-4-opus": {
    input: 15.0,
    output: 75.0,
    cachedInput: 1.5,
    reasoning: 75.0,
  },
  "anthropic/claude-3-7-sonnet": {
    input: 3.0,
    output: 15.0,
    cachedInput: 0.3,
    reasoning: 15.0,
  },

  // xAI Grok models (estimated)
  "xai/grok-4": {
    input: 5.0,
    output: 15.0,
    cachedInput: 0.5,
    reasoning: 15.0,
  },
  "xai/grok-3": {
    input: 2.5,
    output: 10.0,
    cachedInput: 0.25,
    reasoning: 10.0,
  },
  "xai/grok-3-mini": {
    input: 0.15,
    output: 0.6,
    cachedInput: 0.015,
    reasoning: 0.6,
  },

  // OpenRouter models (free tiers)
  "openrouter/gpt-oss-20b:free": {
    input: 0.0,
    output: 0.0,
    cachedInput: 0.0,
    reasoning: 0.0,
  },
  "openrouter/qwen3-8b:free": {
    input: 0.0,
    output: 0.0,
    cachedInput: 0.0,
    reasoning: 0.0,
  },
  "openrouter/qwen3-14b:free": {
    input: 0.0,
    output: 0.0,
    cachedInput: 0.0,
    reasoning: 0.0,
  },
  "openrouter/qwen3-coder": {
    input: 0.2,
    output: 0.2,
    cachedInput: 0.02,
    reasoning: 0.2,
  },
  "openrouter/gemini-2.0-flash-exp:free": {
    input: 0.0,
    output: 0.0,
    cachedInput: 0.0,
    reasoning: 0.0,
  },

  // Ollama models (local, free)
  "ollama/gemma3:1b": {
    input: 0.0,
    output: 0.0,
    cachedInput: 0.0,
    reasoning: 0.0,
  },
  "ollama/gemma3:4b": {
    input: 0.0,
    output: 0.0,
    cachedInput: 0.0,
    reasoning: 0.0,
  },
  "ollama/gemma3:12b": {
    input: 0.0,
    output: 0.0,
    cachedInput: 0.0,
    reasoning: 0.0,
  },
} as const;

export type ModelId = keyof typeof MODEL_PRICING;

export interface TokenCost {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  inputCostUsd: number;
  outputCostUsd: number;
  cachedInputCostUsd: number;
  reasoningCostUsd: number;
  totalCostUsd: number;
  toolCallsCount: number;
  toolCallsCostUsd: number;
}

/**
 * Calculate cost for token usage based on model pricing
 */
export function calculateTokenCost(
  usage: LanguageModelUsage,
  modelId: string,
  toolCallsCount: number = 0,
): TokenCost {
  // Parse model ID to match pricing format
  const normalizedModelId = normalizeModelId(modelId);
  const pricing = MODEL_PRICING[normalizedModelId as ModelId];

  if (!pricing) {
    console.warn(
      `No pricing found for model: ${modelId} (normalized: ${normalizedModelId})`,
    );
    // Return zero costs for unknown models
    return {
      inputTokens: usage.inputTokens || 0,
      outputTokens: usage.outputTokens || 0,
      cachedInputTokens: usage.cachedInputTokens || 0,
      reasoningTokens: usage.reasoningTokens || 0,
      totalTokens: usage.totalTokens || 0,
      inputCostUsd: 0,
      outputCostUsd: 0,
      cachedInputCostUsd: 0,
      reasoningCostUsd: 0,
      totalCostUsd: 0,
      toolCallsCount,
      toolCallsCostUsd: 0,
    };
  }

  // Extract token counts
  const inputTokens = usage.inputTokens || 0;
  const outputTokens = usage.outputTokens || 0;
  const cachedInputTokens = usage.cachedInputTokens || 0;
  const reasoningTokens = usage.reasoningTokens || 0;
  const totalTokens =
    usage.totalTokens ||
    inputTokens + outputTokens + cachedInputTokens + reasoningTokens;

  // Calculate costs (pricing is per 1M tokens, so divide by 1,000,000)
  const inputCostUsd = (inputTokens * pricing.input) / 1_000_000;
  const outputCostUsd = (outputTokens * pricing.output) / 1_000_000;
  const cachedInputCostUsd =
    (cachedInputTokens * pricing.cachedInput) / 1_000_000;
  const reasoningCostUsd = (reasoningTokens * pricing.reasoning) / 1_000_000;

  // Tool calls cost (for now, no additional cost - this can be expanded later)
  const toolCallsCostUsd = 0;

  const totalCostUsd =
    inputCostUsd +
    outputCostUsd +
    cachedInputCostUsd +
    reasoningCostUsd +
    toolCallsCostUsd;

  return {
    inputTokens,
    outputTokens,
    cachedInputTokens,
    reasoningTokens,
    totalTokens,
    inputCostUsd: Number(inputCostUsd.toFixed(8)),
    outputCostUsd: Number(outputCostUsd.toFixed(8)),
    cachedInputCostUsd: Number(cachedInputCostUsd.toFixed(8)),
    reasoningCostUsd: Number(reasoningCostUsd.toFixed(8)),
    totalCostUsd: Number(totalCostUsd.toFixed(8)),
    toolCallsCount,
    toolCallsCostUsd: Number(toolCallsCostUsd.toFixed(8)),
  };
}

/**
 * Normalize model ID to match pricing keys
 * Handles various model ID formats from different providers
 */
function normalizeModelId(modelId: string): string {
  // Handle cases where modelId includes provider prefix
  if (modelId.includes("/")) {
    return modelId;
  }

  // Map common model names to full IDs
  const modelMappings: Record<string, string> = {
    "gpt-5": "openai/gpt-5",
    "gpt-5-mini": "openai/gpt-5-mini",
    "uvala-fuji": "openai/gpt-5-mini", // Fast model using mini pricing
    "uvala-everest": "openai/gpt-5-mini", // Main Uvala model using mini pricing
    "uvala-fuji-micro": "openai/gpt-5-nano", // Internal mapping only
    "gpt-4.1": "openai/gpt-4.1",
    "gpt-4.1-mini": "openai/gpt-4.1-mini",
    o3: "openai/o3",
    "o4-mini": "openai/o4-mini",
    "gpt-oss-120b": "fireworks/gpt-oss-120b",
    "claude-4-sonnet": "anthropic/claude-4-sonnet",
    "claude-4-opus": "anthropic/claude-4-opus",
    "claude-3-7-sonnet": "anthropic/claude-3-7-sonnet",
    "gemini-2.5-flash": "google/gemini-2.5-flash",
    "gemini-2.5-flash-lite": "google/gemini-2.5-flash-lite",
    "gemini-2.5-pro": "google/gemini-2.5-pro",
    "grok-4": "xai/grok-4",
    "grok-3": "xai/grok-3",
    "grok-3-mini": "xai/grok-3-mini",
  };

  return modelMappings[modelId] || modelId;
}

/**
 * Format cost for display with appropriate precision
 */
export function formatCost(costUsd: number): string {
  if (costUsd === 0) return "$0.00";
  if (costUsd < 0.0001) return `$${costUsd.toFixed(8)}`;
  if (costUsd < 0.01) return `$${costUsd.toFixed(6)}`;
  return `$${costUsd.toFixed(4)}`;
}

/**
 * Get model display name for UI
 */
export function getModelDisplayName(modelId: string): string {
  const parts = modelId.split("/");
  if (parts.length === 2) {
    const [provider, model] = parts;
    return `${provider.charAt(0).toUpperCase() + provider.slice(1)} ${model}`;
  }
  return modelId;
}
