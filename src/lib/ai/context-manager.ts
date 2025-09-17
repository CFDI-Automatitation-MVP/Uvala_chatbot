import { UIMessage } from "ai";
import { ChatModel } from "app-types/chat";

// Context limits for your current model
const MODEL_CONTEXT_LIMITS = {
  "Great for all your tasks/uvala-everest": 128000, // Advanced language model (GPT-5 Mini)
  "Fast & Direct/uvala-fuji": 128000, // Fast reasoning model (GPT-5 Mini)
  default: 128000, // Default fallback
} as const;

// Research-based configuration per model
const MODEL_CONFIGS = {
  "Great for all your tasks/uvala-everest": {
    maxContextRatio: 0.68, // 68% - optimal for large context windows
    reserveTokensForResponse: 6000, // More room for complex responses
  },
  "Fast & Direct/uvala-fuji": {
    maxContextRatio: 0.75, // Higher ratio for faster responses
    reserveTokensForResponse: 3000, // Less room needed for concise responses
  },
  default: {
    maxContextRatio: 0.7,
    reserveTokensForResponse: 4000,
  },
} as const;

// Estimate tokens in a message with proper image handling
export function estimateMessageTokens(message: UIMessage): number {
  let tokenCount = 0;

  for (const part of message.parts) {
    if (part.type === "text") {
      tokenCount += Math.ceil(part.text.length / 4);
    } else if (part.type === "file") {
      // Handle file parts (especially images) more accurately
      const partData = part as any;

      if (partData.file?.type?.startsWith("image/")) {
        // For images, estimate based on actual size
        // Base64 images: roughly 1.33x the original size
        // Vision models typically use ~765 tokens per image regardless of size
        // But we need to account for the base64 data in context

        if (partData.file.data && typeof partData.file.data === "string") {
          const base64Size = partData.file.data.length;
          // Base64 data is extremely heavy in context - use very aggressive estimation
          // Large images (>50KB base64) should be estimated at nearly 1:1 token ratio
          if (base64Size > 50000) {
            tokenCount += Math.ceil(base64Size / 1.2); // Very aggressive for large images
          } else {
            tokenCount += Math.ceil(base64Size / 2); // Aggressive for smaller images
          }
        } else {
          tokenCount += 765; // Standard vision processing tokens
        }
      } else {
        // Other file types
        tokenCount += Math.ceil(JSON.stringify(part).length / 4);
      }
    } else {
      // For tool-call, tool-result, etc.
      const partJson = JSON.stringify(part);

      // Check if this contains base64 image data
      if (partJson.includes("data:image/") && partJson.includes("base64,")) {
        // Extract and estimate base64 data more aggressively
        const base64Matches = partJson.match(
          /data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/g,
        );
        if (base64Matches) {
          let base64TokenCount = 0;
          base64Matches.forEach((match) => {
            const base64Data = match.split("base64,")[1];
            if (base64Data) {
              // Extremely aggressive estimation for large base64 images in tool outputs
              if (base64Data.length > 50000) {
                base64TokenCount += Math.ceil(base64Data.length / 1.1); // Nearly 1:1 for large images
              } else {
                base64TokenCount += Math.ceil(base64Data.length / 1.5); // Very aggressive for smaller
              }
            }
          });

          // Use the larger of JSON estimation or base64 estimation
          const jsonTokenCount = Math.ceil(partJson.length / 4);
          tokenCount += Math.max(base64TokenCount, jsonTokenCount);
        } else {
          tokenCount += Math.ceil(partJson.length / 4);
        }
      } else {
        tokenCount += Math.ceil(partJson.length / 4);
      }
    }
  }

  // Add overhead per message (role, metadata, etc.)
  return Math.max(tokenCount + 10, 1);
}

// Get context limit for your models
export function getModelContextLimit(chatModel: ChatModel): number {
  const modelKey = `${chatModel.provider}/${chatModel.model}`;
  return (
    MODEL_CONTEXT_LIMITS[modelKey as keyof typeof MODEL_CONTEXT_LIMITS] ||
    MODEL_CONTEXT_LIMITS.default
  );
}

// Get model-specific configuration
function getModelConfig(chatModel: ChatModel) {
  const modelKey = `${chatModel.provider}/${chatModel.model}`;
  return (
    MODEL_CONFIGS[modelKey as keyof typeof MODEL_CONFIGS] ||
    MODEL_CONFIGS.default
  );
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
  customConfig?: Partial<ContextTruncationConfig>,
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

  const availableTokens =
    Math.floor(maxContextTokens * config.maxContextRatio) -
    config.reserveTokensForResponse;

  // Calculate original token count
  const originalTokens = messages.reduce(
    (sum, msg) => sum + estimateMessageTokens(msg),
    0,
  );

  // If within limits, return as-is
  if (
    originalTokens <= availableTokens &&
    messages.length <= config.maxMessages
  ) {
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
  const truncatedMessages = selectMessagesForContext(
    messages,
    availableTokens,
    config,
  );
  const finalTokens = truncatedMessages.reduce(
    (sum, msg) => sum + estimateMessageTokens(msg),
    0,
  );

  return {
    messages: truncatedMessages,
    truncated: true,
    originalCount: messages.length,
    finalCount: truncatedMessages.length,
    originalTokens,
    finalTokens,
    tokensSaved: originalTokens - finalTokens,
    tokensSavedPercentage: Math.round(
      ((originalTokens - finalTokens) / originalTokens) * 100,
    ),
    modelInfo: {
      model: `${chatModel.provider}/${chatModel.model}`,
      contextLimit: maxContextTokens,
      configUsed: `${Math.round(config.maxContextRatio * 100)}% context ratio`,
    },
  };
}

// Helper to check if message contains large images
function hasLargeImages(message: UIMessage): boolean {
  return message.parts.some((part) => {
    if (part.type === "file") {
      const partData = part as any;
      if (partData.file?.type?.startsWith("image/") && partData.file?.data) {
        return partData.file.data.length > 50000; // 50KB+ base64 images
      }
    } else if (part.type !== "text") {
      const partJson = JSON.stringify(part);
      if (partJson.includes("data:image/") && partJson.includes("base64,")) {
        const base64Matches = partJson.match(
          /data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/g,
        );
        if (base64Matches) {
          return base64Matches.some((match) => {
            const base64Data = match.split("base64,")[1];
            return base64Data && base64Data.length > 50000; // 50KB+ base64
          });
        }
      }
    }
    return false;
  });
}

// Smart message selection algorithm with aggressive image management
function selectMessagesForContext(
  messages: UIMessage[],
  availableTokens: number,
  config: ContextTruncationConfig,
): UIMessage[] {
  if (messages.length === 0) return [];

  // Step 1: Separate messages by type and recency
  const olderMessages = messages.slice(0, -10);

  // Always include the last message (current user input)
  const lastMessage = messages[messages.length - 1];
  const selectedMessages: UIMessage[] = [lastMessage];
  let usedTokens = estimateMessageTokens(lastMessage);

  // If the last message itself exceeds available tokens, only include it
  if (usedTokens > availableTokens * 0.9) {
    return selectedMessages;
  }

  // Step 2: Count images in recent conversation and remove excess
  let imageCount = 0;
  const maxImagesInContext = 3; // Only keep 3 most recent images max

  // Work backwards through recent messages first
  for (
    let i = messages.length - 2;
    i >= Math.max(0, messages.length - 10);
    i--
  ) {
    const message = messages[i];
    const messageTokens = estimateMessageTokens(message);
    const hasLargeImage = hasLargeImages(message);

    // If this message has a large image
    if (hasLargeImage) {
      imageCount++;
      // Skip this image if we already have too many or if it would use too many tokens
      if (
        imageCount > maxImagesInContext ||
        usedTokens + messageTokens > availableTokens * 0.8
      ) {
        continue; // Skip this message entirely
      }
    }

    // Check if we can fit this message
    if (
      usedTokens + messageTokens <= availableTokens &&
      selectedMessages.length < config.maxMessages
    ) {
      selectedMessages.unshift(message);
      usedTokens += messageTokens;
    } else if (!hasLargeImage && messageTokens < 1000) {
      // For small text messages, be more lenient
      if (usedTokens + messageTokens <= availableTokens * 1.1) {
        selectedMessages.unshift(message);
        usedTokens += messageTokens;
      }
    }
  }

  // Step 3: Add older text-only messages if we have room
  if (usedTokens < availableTokens * 0.6 && selectedMessages.length < 8) {
    for (let i = olderMessages.length - 1; i >= 0; i--) {
      const message = olderMessages[i];
      const messageTokens = estimateMessageTokens(message);
      const hasLargeImage = hasLargeImages(message);

      // Only include older messages without large images
      if (
        !hasLargeImage &&
        usedTokens + messageTokens <= availableTokens * 0.7
      ) {
        selectedMessages.unshift(message);
        usedTokens += messageTokens;

        if (selectedMessages.length >= 12) break; // Reasonable limit
      }
    }
  }

  // Step 4: Ensure minimum messages but prioritize text over images
  if (
    selectedMessages.length < config.minMessages &&
    messages.length >= config.minMessages
  ) {
    const candidateMessages = messages.slice(-6); // Last 6 messages

    for (const message of candidateMessages) {
      if (!selectedMessages.some((sm) => sm.id === message.id)) {
        const messageTokens = estimateMessageTokens(message);
        const hasLargeImage = hasLargeImages(message);

        // Be very strict with images, lenient with text
        if (!hasLargeImage) {
          selectedMessages.push(message);
          usedTokens += messageTokens;
        } else if (
          imageCount <= 1 &&
          usedTokens + messageTokens <= availableTokens * 0.9
        ) {
          selectedMessages.push(message);
          usedTokens += messageTokens;
          imageCount++;
        }
      }
    }

    // Re-sort to maintain chronological order
    selectedMessages.sort((a, b) => {
      const indexA = messages.findIndex((m) => m.id === a.id);
      const indexB = messages.findIndex((m) => m.id === b.id);
      return indexA - indexB;
    });
  }

  return selectedMessages;
}

// Helper to log truncation results
export function logTruncationResult(
  result: ContextTruncationResult,
  logger?: any,
): void {
  if (!logger) return;

  if (result.truncated) {
    logger.info(`🔄 Context truncated for ${result.modelInfo.model}`);
    logger.info(`📊 Messages: ${result.originalCount} → ${result.finalCount}`);
    logger.info(
      `💰 Tokens saved: ${result.tokensSaved} (${result.tokensSavedPercentage}%)`,
    );
    logger.info(
      `⚙️  Config: ${result.modelInfo.configUsed}, Limit: ${result.modelInfo.contextLimit}`,
    );
    logger.info(`📈 Final tokens: ${result.finalTokens}`);
  } else {
    logger.info(`✅ No truncation needed for ${result.modelInfo.model}`);
    logger.info(
      `📊 ${result.finalCount} messages, ${result.finalTokens} tokens`,
    );
  }
}
