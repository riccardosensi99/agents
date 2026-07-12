import { z } from "zod";

export const discordInteractionSchema = z.object({
  id: z.string(),
  type: z.number(),
  token: z.string(),
  application_id: z.string(),
  data: z
    .object({
      custom_id: z.string().optional()
    })
    .optional(),
  message: z
    .object({
      id: z.string(),
      channel_id: z.string().optional()
    })
    .optional(),
  member: z
    .object({
      user: z
        .object({
          id: z.string()
        })
        .optional()
    })
    .optional(),
  user: z
    .object({
      id: z.string()
    })
    .optional()
});
