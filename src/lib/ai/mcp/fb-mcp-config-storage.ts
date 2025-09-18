// MCP functionality disabled - stub implementation

import type { MCPConfigStorage } from "./create-mcp-clients-manager";

export function createFileBasedMCPConfigsStorage(): MCPConfigStorage {
  return {
    loadAll: async () => [],
    save: async (server) => server,
    get: async () => null,
  };
}
