import {
  createMCPClientsManager,
  type MCPClientsManager,
} from "./create-mcp-clients-manager";
declare global {
  // eslint-disable-next-line no-var
  var __mcpClientsManager__: MCPClientsManager;
}

if (!globalThis.__mcpClientsManager__) {
  // MCP functionality disabled
  globalThis.__mcpClientsManager__ = createMCPClientsManager();
}

export const initMCPManager = async () => {
  return globalThis.__mcpClientsManager__.init();
};

export const mcpClientsManager = globalThis.__mcpClientsManager__;
