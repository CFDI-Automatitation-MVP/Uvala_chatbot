export const CacheKeys = {
  thread: (threadId: string) => `thread-${threadId}`,
  user: (userId: string) => `user-${userId}`,
  agentInstructions: (agent: string) => `agent-instructions-${agent}`,
};
