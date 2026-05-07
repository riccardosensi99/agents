import type { Platform, RecommendedAction, RiskLevel } from "@prisma/client";

export type GeneratedDraft = {
  title: string;
  content: string;
  platform: Platform;
};

export type SupervisorReview = {
  qualityScore: number;
  riskLevel: RiskLevel;
  feedback: string;
  recommendedAction: RecommendedAction;
};
