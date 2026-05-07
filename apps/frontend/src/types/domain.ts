export type AgentStatus = "idle" | "working" | "waiting_approval" | "error";
export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "waiting_approval"
  | "rejected"
  | "failed";
export type DraftStatus =
  | "draft"
  | "waiting_approval"
  | "approved"
  | "rejected"
  | "revision_requested";
export type Platform = "instagram" | "linkedin" | "internal";
export type RiskLevel = "low" | "medium" | "high";
export type RecommendedAction = "approve" | "revise" | "reject";

export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type AgentLog = {
  id: string;
  agentId: string;
  level: string;
  message: string;
  meta?: unknown;
  createdAt: string;
};

export type Task = {
  id: string;
  agentId: string;
  title: string;
  prompt: string;
  status: TaskStatus;
  result?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  agent?: Agent;
  drafts?: Draft[];
};

export type Draft = {
  id: string;
  agentId: string;
  taskId?: string | null;
  title: string;
  content: string;
  platform: Platform;
  status: DraftStatus;
  supervisorScore?: number | null;
  riskLevel?: RiskLevel | null;
  supervisorFeedback?: string | null;
  recommendedAction?: RecommendedAction | null;
  createdAt: string;
  updatedAt: string;
  agent?: Agent;
  task?: Task | null;
};

export type Agent = {
  id: string;
  name: string;
  slug: string;
  role: string;
  description: string;
  status: AgentStatus;
  avatarType: string;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastActivity?: string;
  currentTask?: Task | null;
  metrics?: {
    completedTasks: number;
    failedTasks: number;
    draftsCreated: number;
  };
  recentLogs?: AgentLog[];
  recentTasks?: Task[];
  recentDrafts?: Draft[];
};

export type SystemStatus = {
  api: "ok";
  database: "ok";
  aiProvider: "mock" | "openai";
  schedulerEnabled: boolean;
  socialPublishing: "disabled";
  uptimeSeconds: number;
  counts: {
    agents: number;
    pendingTasks: number;
    runningTasks: number;
    approvalDrafts: number;
  };
  recentEvents: Array<{
    id: string;
    level: string;
    type: string;
    message: string;
    createdAt: string;
  }>;
};
