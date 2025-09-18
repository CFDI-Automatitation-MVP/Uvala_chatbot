// MCP functionality disabled - stub implementation

import type { MCPServerInfo, MCPToolInfo } from "app-types/mcp";

export interface MCPClient {
  id: string;
  name: string;
  status: "connected" | "disconnected" | "connecting" | "authorizing";
  toolInfo: MCPToolInfo[];
  error?: string;
  getInfo(): MCPServerInfo;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  callTool(name: string, args: any): Promise<any>;
}

export function createMCPClient(
  id: string,
  name: string,
  _serverConfig: any,
): MCPClient {
  return {
    id,
    name,
    status: "disconnected",
    toolInfo: [],
    getInfo: () => ({
      id,
      name,
      status: "disconnected",
      toolInfo: [],
      config: { url: "disabled://mcp" },
    }),
    connect: async () => {},
    disconnect: async () => {},
    callTool: async () => ({}),
  };
}
