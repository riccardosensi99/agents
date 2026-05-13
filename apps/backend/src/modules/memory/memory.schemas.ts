import { z } from "zod";

export const memoryTypeSchema = z.enum([
  "EXPERIENCE",
  "OPINION",
  "LESSON",
  "WORKFLOW",
  "STACK",
  "CLIENT_CASE",
  "MISTAKE",
  "DEPLOY",
  "CONTENT_EXAMPLE"
]);

const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9-]+$/i, "Use letters, numbers and dashes only")
  .transform((value) => value.toLowerCase());

export const memoryParamsSchema = z.object({
  id: z.string().uuid()
});

export const memoryListQuerySchema = z.object({
  search: z.string().trim().max(160).optional(),
  type: memoryTypeSchema.optional(),
  tag: tagSchema.optional()
});

export const memoryMutationSchema = z.object({
  title: z.string().trim().min(2).max(160),
  content: z.string().trim().min(5).max(5000),
  type: memoryTypeSchema,
  tags: z
    .array(tagSchema)
    .max(12)
    .default([])
    .transform((tags) => Array.from(new Set(tags))),
  importance: z.coerce.number().int().min(1).max(5).default(3),
  source: z.string().trim().min(2).max(80).default("manual")
});

export const memoryPatchSchema = memoryMutationSchema.partial();
