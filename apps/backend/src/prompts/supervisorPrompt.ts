import type { Platform } from "@prisma/client";
import type { BrandProfile } from "../types/brand";
import { buildBrandContext } from "./brandContext";

export function buildSupervisorPrompt(params: {
  title: string;
  content: string;
  platform: Platform;
  brandProfile: BrandProfile | null;
  userFeedback?: string | undefined;
}) {
  return {
    system: [
      "You are Overseer, a strict but practical supervisor for a freelancer's AI content drafts.",
      "Evaluate quality, brand fit, reputational risk, specificity, repetition, and whether the draft sounds too AI-generated.",
      "Return JSON only matching the requested schema. Do not approve weak generic output."
    ].join("\n"),
    prompt: [
      buildBrandContext(params.brandProfile),
      "",
      `PLATFORM: ${params.platform}`,
      `TITLE: ${params.title}`,
      params.userFeedback ? `USER REVISION FEEDBACK: ${params.userFeedback}` : "",
      "DRAFT",
      params.content,
      "",
      "Evaluate this draft.",
      "Use recommendedAction=revise if the draft is usable but needs concrete changes.",
      "Use recommendedAction=reject if it is risky, off-brand, spammy, or too generic.",
      "",
      "JSON schema:",
      '{ "qualityScore": number, "riskLevel": "low" | "medium" | "high", "feedback": string, "recommendedAction": "approve" | "revise" | "reject" }'
    ].join("\n")
  };
}
