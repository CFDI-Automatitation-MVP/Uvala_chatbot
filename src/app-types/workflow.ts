// Workflow types - Hidden/Disabled but preserved for import compatibility
// All workflow functionality is disabled from UI but types are maintained

export interface WorkflowSummary {
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

export interface DBWorkflow {
  id: string;
  name: string;
  description?: string;
  nodes: DBNode[];
  edges: DBEdge[];
  icon?: any;
}

export interface DBNode {
  id: string;
  kind: string;
  name?: string;
  description?: string;
}

export interface DBEdge {
  id: string;
  source: string;
  target: string;
}

export interface VercelAIWorkflowToolStreamingResult {
  status: "running" | "success" | "fail";
  workflowName?: string;
  workflowIcon?: any;
  history: VercelAIWorkflowToolStreaming[];
  result?: any;
  error?: {
    name: string;
    message: string;
  };
}

export interface VercelAIWorkflowToolStreaming {
  id: string;
  name: string;
  kind: string;
  status: "running" | "success" | "fail";
  startedAt: number;
  endedAt?: number;
  result?: any;
  error?: {
    name: string;
    message: string;
  };
}

export interface VercelAIWorkflowTool {
  toolName: string;
  tool: any;
  execute?: (...args: any[]) => any;
  _workflowId?: string;
  _originToolName?: string;
  _toolName?: string;
}

export const VercelAIWorkflowToolStreamingResultTag = {
  isMaybe: () => false,
  create: (result: any) => result,
};

export const VercelAIWorkflowToolTag = {
  isMaybe: () => false,
  create: (tool: any) => tool,
};