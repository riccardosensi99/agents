import type { Platform } from "@prisma/client";
import type { BrandProfile } from "../../types/brand";
import { buildSupervisorPrompt } from "../../prompts/supervisorPrompt";
import { supervisorReviewSchema } from "../../validators/aiOutputs";
import { aiClient } from "../ai/aiClient";
import type { AgentRunContext, SupervisorReview } from "./types";

export async function reviewDraftWithSupervisor(params: {
  title: string;
  content: string;
  platform: Platform;
  brandProfile: BrandProfile | null;
  userFeedback?: string | undefined;
  context?: AgentRunContext;
  memoryContext?: string;
}): Promise<SupervisorReview> {
  const prompt = buildSupervisorPrompt(params);

  try {
    return await aiClient.generateJson(
      {
        ...prompt,
        ...params.context,
        operation: "supervisor.review_draft",
        responseFormat: "json",
        temperature: 0.2
      },
      supervisorReviewSchema
    );
  } catch {
    return {
      qualityScore: 6,
      riskLevel: "medium",
      feedback:
        "Supervisor response was not valid JSON. Review manually before approval.",
      recommendedAction: "revise"
    };
  }
}
