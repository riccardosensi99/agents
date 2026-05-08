import { prisma } from "../../db/prisma";
import type { SupervisorReview } from "../agents/types";

export async function createDraftVersion(params: {
  draft: { id: string; currentVersion: number };
  title: string;
  content: string;
  review?: SupervisorReview | null;
  userFeedback?: string;
  createdBy?: string;
}) {
  const nextVersion = params.draft.currentVersion + 1;

  await (prisma as any).draftVersion.create({
    data: {
      draftId: params.draft.id,
      version: nextVersion,
      title: params.title,
      content: params.content,
      supervisorScore: params.review?.qualityScore ?? null,
      riskLevel: params.review?.riskLevel ?? null,
      supervisorFeedback: params.review?.feedback ?? null,
      recommendedAction: params.review?.recommendedAction ?? null,
      createdBy: params.createdBy ?? "system",
      ...(params.userFeedback ? { userFeedback: params.userFeedback } : {})
    }
  });

  return nextVersion;
}

export async function createInitialDraftVersion(params: {
  draftId: string;
  title: string;
  content: string;
  review?: SupervisorReview | null;
}) {
  await (prisma as any).draftVersion.create({
    data: {
      draftId: params.draftId,
      version: 1,
      title: params.title,
      content: params.content,
      supervisorScore: params.review?.qualityScore ?? null,
      riskLevel: params.review?.riskLevel ?? null,
      supervisorFeedback: params.review?.feedback ?? null,
      recommendedAction: params.review?.recommendedAction ?? null,
      createdBy: "agent"
    }
  });
}
