import { z } from "zod";

export const taskParamsSchema = z.object({
  id: z.string().uuid()
});

export const taskStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "waiting_approval",
  "rejected",
  "revision_requested",
  "failed"
]);

export const taskPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export const platformSchema = z.enum(["instagram", "linkedin", "internal"]);

export const createTaskSchema = z.object({
  title: z.string().min(2).max(160),
  prompt: z.string().min(5).max(5000),
  platform: platformSchema.optional(),
  priority: taskPrioritySchema.default("normal"),
  scheduledAt: z.string().datetime().optional().nullable()
});
