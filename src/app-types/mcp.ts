// MCP types - Hidden functionality but preserved types to prevent errors
// MCP functionality is disabled from UI but types are maintained

export interface MCPServerInfo {
  id: string;
  name: string;
  status: "connected" | "disconnected" | "connecting" | "authorizing";
  toolInfo: { name: string; description: string }[];
  error?: string;
}

export interface AllowedMCPServer {
  tools: string[];
}

export interface VercelAIMcpTool {
  toolName: string;
  tool: any;
  execute?: (...args: any[]) => any;
}

export const VercelAIMcpToolTag = {
  isMaybe: () => false,
  create: (tool: any) => tool,
};

// Additional MCP types that might be imported
export interface MCPToolInfo {
  name: string;
  description: string;
}

export interface McpToolCustomization {
  toolName: string;
  serverId: string;
  instructions?: string;
}