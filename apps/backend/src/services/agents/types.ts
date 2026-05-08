import type { Platform, RecommendedAction, RiskLevel } from "@prisma/client";

export type GeneratedDraft = {
  title: string;
  content: string;
  platform: Platform;
  metadata: Record<string, unknown>;
};

export type SupervisorReview = {
  qualityScore: number;
  riskLevel: RiskLevel;
  feedback: string;
  recommendedAction: RecommendedAction;
};

export type AgentRunContext = {
  taskId?: string;
  agentSlug?: string;
  draftId?: string;
};
