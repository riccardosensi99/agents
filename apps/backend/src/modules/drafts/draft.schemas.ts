import { z } from "zod";

export const draftParamsSchema = z.object({
  id: z.string().uuid()
});

export const draftStatusSchema = z.enum([
  "draft",
  "waiting_approval",
  "approved",
  "rejected",
  "revision_requested"
]);

export const patchDraftSchema = z.object({
  title: z.string().min(2).max(180).optional(),
  content: z.string().min(1).max(12000).optional(),
  status: draftStatusSchema.optional()
});

export const revisionRequestSchema = z.object({
  comment: z.string().max(2000).optional()
});

export const rejectDraftSchema = z.object({
  comment: z.string().max(2000).optional()
});
