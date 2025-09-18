// MCP functionality disabled - stub implementation

export class PgOAuthProvider {
  constructor(_config: any) {
    // MCP functionality disabled
  }

  async getToken(): Promise<string | null> {
    return null;
  }

  async refreshToken(): Promise<string | null> {
    return null;
  }

  async revokeToken(): Promise<void> {
    // MCP functionality disabled
  }
}

export const PgOAuthClientProvider = PgOAuthProvider;
