export type AgentStatus = "idle" | "working" | "waiting_approval" | "error";
export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "waiting_approval"
  | "rejected"
  | "revision_requested"
  | "failed";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
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

export type TaskEvent = {
  id: string;
  taskId: string;
  type: string;
  message: string;
  meta?: unknown;
  createdAt: string;
};

export type Task = {
  id: string;
  agentId: string;
  title: string;
  prompt: string;
  platform: Platform;
  status: TaskStatus;
  priority: TaskPriority;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  retryCount: number;
  result?: string | null;
  resultJson?: unknown;
  error?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  agent?: Agent;
  drafts?: Draft[];
  events?: TaskEvent[];
};

export type DraftVersion = {
  id: string;
  draftId: string;
  version: number;
  title: string;
  content: string;
  supervisorScore?: number | null;
  riskLevel?: RiskLevel | null;
  supervisorFeedback?: string | null;
  recommendedAction?: RecommendedAction | null;
  userFeedback?: string | null;
  createdBy: string;
  createdAt: string;
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
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  agent?: Agent;
  task?: Task | null;
  versions?: DraftVersion[];
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
    failedTasks: number;
    approvalDrafts: number;
  };
  unreadNotifications: number;
  recentEvents: Array<{
    id: string;
    level: string;
    type: string;
    message: string;
    createdAt: string;
  }>;
};

export type BrandProfile = {
  id: string;
  userId: string;
  ownerName: string;
  bio: string;
  services: string;
  technicalStack: string;
  toneOfVoice: string;
  targetClients: string;
  businessGoals: string;
  topicsToPush: string;
  topicsToAvoid: string;
  goodPostExamples: string;
  bannedWords: string;
  createdAt: string;
  updatedAt: string;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  status: string;
  meta?: unknown;
  readAt?: string | null;
  createdAt: string;
};
