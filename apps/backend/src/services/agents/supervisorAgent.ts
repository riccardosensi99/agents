import { z } from "zod";
import { aiClient } from "../ai/aiClient";
import type { SupervisorReview } from "./types";

const reviewSchema = z.object({
  qualityScore: z.number().int().min(1).max(10),
  riskLevel: z.enum(["low", "medium", "high"]),
  feedback: z.string().min(1),
  recommendedAction: z.enum(["approve", "revise", "reject"])
});

const jsonFromText = (value: string) => {
  const match = value.match(/\{[\s\S]*\}/);
  return match ? match[0] : value;
};

export async function reviewDraftWithSupervisor(params: {
  title: string;
  content: string;
  platform: string;
}): Promise<SupervisorReview> {
  const raw = await aiClient.generateText({
    system:
      "You are Overseer, a strict supervisor agent. Return JSON only with qualityScore 1-10, riskLevel low|medium|high, feedback, recommendedAction approve|revise|reject.",
    prompt: [
      `Platform: ${params.platform}`,
      `Title: ${params.title}`,
      "Draft:",
      params.content,
      "",
      "Check quality, repeated phrasing, risky claims, and whether it sounds too generic or too AI."
    ].join("\n"),
    temperature: 0.2
  });

  try {
    const parsed = JSON.parse(jsonFromText(raw));
    return reviewSchema.parse(parsed);
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
