// Agent types - Hidden functionality but preserved types to prevent errors
// Agent functionality is disabled from UI but types are maintained

export interface AgentSummary {
  id: string;
  name: string;
  description?: string;
  icon?: {
    type: string;
    value: string;
    style?: any;
  };
  userId?: string;
  userName?: string;
  userAvatar?: string;
}