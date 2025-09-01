import { UIMessage } from "ai";
import { ChatModel } from "app-types/chat";

// Context limits for your 2 current models (CORRECTED VALUES)
const MODEL_CONTEXT_LIMITS = {
  "Daily Assistant/Fuji": 128000,        // GPT-5-mini equivalent
  "Advanced Reasoning/Everest": 131072,  // Fireworks GPT-OSS-120B (CORRECTED)
  "default": 128000 // Default fallback
} as const;

// Research-based configuration per model
const MODEL_CONFIGS = {
  "Daily Assistant/Fuji": {
    maxContextRatio: 0.68, // 68% - optimal for large context windows
    reserveTokensForResponse: 6000, // More room for complex responses
  },
  "Advanced Reasoning/Everest": {
    maxContextRatio: 0.68, // 68% - similar large context window to Fuji
    reserveTokensForResponse: 6000, // Same as Fuji since both have large contexts
  },
  "default": {
    maxContextRatio: 0.7,
    reserveTokensForResponse: 4000,
  }
} as const;

// Estimate tokens in a message (1 token ≈ 4 characters)
export function estimateMessageTokens(message: UIMessage): number {
  let tokenCount = 0;
  
  for (const part of message.parts) {
    if (part.type === 'text') {
      tokenCount += Math.ceil(part.text.length / 4);
    } else {
      // For all other part types (tool-call, tool-result, file, etc.)
      // Convert to JSON string and estimate tokens
      tokenCount += Math.ceil(JSON.stringify(part).length / 4);
      
      // Add extra tokens for image/file processing
      if (part.type === 'file' || part.type.includes('image')) {
        tokenCount += 500; // Additional estimate for media processing
      }
    }
  }
  
  // Add overhead per message (role, metadata, etc.)
  return Math.max(tokenCount + 10, 1);
}

// Get context limit for your models
export function getModelContextLimit(chatModel: ChatModel): number {
  const modelKey = `${chatModel.provider}/${chatModel.model}`;
  return MODEL_CONTEXT_LIMITS[modelKey as keyof typeof MODEL_CONTEXT_LIMITS] || MODEL_CONTEXT_LIMITS.default;
}

// Get model-specific configuration
function getModelConfig(chatModel: ChatModel) {
  const modelKey = `${chatModel.provider}/${chatModel.model}`;
  return MODEL_CONFIGS[modelKey as keyof typeof MODEL_CONFIGS] || MODEL_CONFIGS.default;
}

// Context truncation configuration
export interface ContextTruncationConfig {
  maxContextRatio: number;
  reserveTokensForResponse: number;
  minMessages: number; // Always keep at least this many
  maxMessages: number; // Never exceed this many
}

// Truncation result
export interface ContextTruncationResult {
  messages: UIMessage[];
  truncated: boolean;
  originalCount: number;
  finalCount: number;
  originalTokens: number;
  finalTokens: number;
  tokensSaved: number;
  tokensSavedPercentage: number;
  modelInfo: {
    model: string;
    contextLimit: number;
    configUsed: string;
  };
}

// Main truncation function
export function truncateConversation(
  messages: UIMessage[], 
  chatModel: ChatModel,
  customConfig?: Partial<ContextTruncationConfig>
): ContextTruncationResult {
  // Get model-specific configuration
  const modelConfig = getModelConfig(chatModel);
  const maxContextTokens = getModelContextLimit(chatModel);
  
  const config: ContextTruncationConfig = {
    maxContextRatio: modelConfig.maxContextRatio,
    reserveTokensForResponse: modelConfig.reserveTokensForResponse,
    minMessages: 2,
    maxMessages: 50,
    ...customConfig, // Allow overrides
  };
  
  const availableTokens = Math.floor(maxContextTokens * config.maxContextRatio) - config.reserveTokensForResponse;
  
  // Calculate original token count
  const originalTokens = messages.reduce((sum, msg) => sum + estimateMessageTokens(msg), 0);
  
  // If within limits, return as-is
  if (originalTokens <= availableTokens && messages.length <= config.maxMessages) {
    return {
      messages,
      truncated: false,
      originalCount: messages.length,
      finalCount: messages.length,
      originalTokens,
      finalTokens: originalTokens,
      tokensSaved: 0,
      tokensSavedPercentage: 0,
      modelInfo: {
        model: `${chatModel.provider}/${chatModel.model}`,
        contextLimit: maxContextTokens,
        configUsed: `${Math.round(config.maxContextRatio * 100)}% context ratio`,
      },
    };
  }
  
  // Perform smart truncation
  const truncatedMessages = selectMessagesForContext(messages, availableTokens, config);
  const finalTokens = truncatedMessages.reduce((sum, msg) => sum + estimateMessageTokens(msg), 0);
  
  return {
    messages: truncatedMessages,
    truncated: true,
    originalCount: messages.length,
    finalCount: truncatedMessages.length,
    originalTokens,
    finalTokens,
    tokensSaved: originalTokens - finalTokens,
    tokensSavedPercentage: Math.round(((originalTokens - finalTokens) / originalTokens) * 100),
    modelInfo: {
      model: `${chatModel.provider}/${chatModel.model}`,
      contextLimit: maxContextTokens,
      configUsed: `${Math.round(config.maxContextRatio * 100)}% context ratio`,
    },
  };
}

// Smart message selection algorithm
function selectMessagesForContext(
  messages: UIMessage[], 
  availableTokens: number, 
  config: ContextTruncationConfig
): UIMessage[] {
  if (messages.length === 0) return [];
  
  // Always include the last message (current user input)
  const lastMessage = messages[messages.length - 1];
  const selectedMessages: UIMessage[] = [lastMessage];
  let usedTokens = estimateMessageTokens(lastMessage);
  
  // Work backwards through messages, prioritizing recent ones
  for (let i = messages.length - 2; i >= 0; i--) {
    const message = messages[i];
    const messageTokens = estimateMessageTokens(message);
    
    // Check if we can fit this message
    if (usedTokens + messageTokens <= availableTokens && 
        selectedMessages.length < config.maxMessages) {
      
      selectedMessages.unshift(message); // Add to beginning to maintain order
      usedTokens += messageTokens;
    } else {
      break; // Stop if we exceed limits
    }
  }
  
  // Ensure we have minimum messages if possible
  if (selectedMessages.length < config.minMessages && messages.length >= config.minMessages) {
    // Force include more recent messages even if slightly over token limit
    for (let i = messages.length - config.minMessages; i < messages.length; i++) {
      const message = messages[i];
      if (!selectedMessages.some(sm => sm.id === message.id)) {
        selectedMessages.push(message);
      }
    }
    // Re-sort to maintain chronological order
    selectedMessages.sort((a, b) => {
      const indexA = messages.findIndex(m => m.id === a.id);
      const indexB = messages.findIndex(m => m.id === b.id);
      return indexA - indexB;
    });
  }
  
  return selectedMessages;
}

// Helper to log truncation results
export function logTruncationResult(result: ContextTruncationResult, logger?: any): void {
  if (!logger) return;
  
  if (result.truncated) {
    logger.info(`🔄 Context truncated for ${result.modelInfo.model}`);
    logger.info(`📊 Messages: ${result.originalCount} → ${result.finalCount}`);
    logger.info(`💰 Tokens saved: ${result.tokensSaved} (${result.tokensSavedPercentage}%)`);
    logger.info(`⚙️  Config: ${result.modelInfo.configUsed}, Limit: ${result.modelInfo.contextLimit}`);
    logger.info(`📈 Final tokens: ${result.finalTokens}`);
  } else {
    logger.info(`✅ No truncation needed for ${result.modelInfo.model}`);
    logger.info(`📊 ${result.finalCount} messages, ${result.finalTokens} tokens`);
  }
}