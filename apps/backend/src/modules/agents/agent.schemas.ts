import { z } from "zod";

export const agentStatusSchema = z.enum(["idle", "working", "waiting_approval", "error"]);

export const createAgentSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .min(2)
    .max(80)
    .optional(),
  role: z.string().min(2).max(120),
  description: z.string().min(2).max(1000),
  status: agentStatusSchema.optional(),
  avatarType: z.string().min(2).max(80),
  config: z.record(z.unknown()).default({})
});

export const updateAgentSchema = createAgentSchema.partial();

export const agentParamsSchema = z.object({
  id: z.string().uuid()
});

export const createAgentTaskSchema = z.object({
  title: z.string().min(2).max(160),
  prompt: z.string().min(5).max(5000),
  platform: z.enum(["instagram", "linkedin", "internal"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  scheduledAt: z.string().datetime().optional().nullable()
});
