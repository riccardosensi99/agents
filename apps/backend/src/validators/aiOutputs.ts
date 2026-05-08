import { z } from "zod";

export const generatedDraftSchema = z.object({
  title: z.string().min(2).max(180),
  content: z.string().min(20).max(12000),
  metadata: z.record(z.unknown()).default({})
});

export const supervisorReviewSchema = z.object({
  qualityScore: z.coerce
    .number()
    .transform((value) => Math.max(1, Math.min(10, Math.round(value))))
    .pipe(z.number().int().min(1).max(10)),
  riskLevel: z.enum(["low", "medium", "high"]),
  feedback: z.string().min(1).max(4000),
  recommendedAction: z.enum(["approve", "revise", "reject"])
});

export type GeneratedDraftOutput = z.infer<typeof generatedDraftSchema>;
export type SupervisorReviewOutput = z.infer<typeof supervisorReviewSchema>;
