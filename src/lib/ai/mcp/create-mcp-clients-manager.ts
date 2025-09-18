// MCP functionality disabled - stub implementation

export interface MCPConfigStorage {
  loadAll(): Promise<any[]>;
  save(server: any): Promise<any>;
  get(id: string): Promise<any | null>;
}

export type MCPClientsManager = {
  getClients: () => Map<string, any>;
  addClient: (id: string, name: string, config: any) => Promise<void>;
  persistClient: (server: any) => Promise<void>;
  removeClient: (id: string) => Promise<void>;
  getAllTools: () => any[];
  getClientInfo: () => any[];
  init: () => Promise<void>;
};

export function createMCPClientsManager(): MCPClientsManager {
  return {
    getClients: () => new Map(),
    addClient: async () => {},
    persistClient: async () => {},
    removeClient: async () => {},
    getAllTools: () => [],
    getClientInfo: () => [],
    init: async () => {},
  };
}
