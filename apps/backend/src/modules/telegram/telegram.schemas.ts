import { z } from "zod";

export const telegramWebhookSchema = z.object({
  update_id: z.number().optional(),
  callback_query: z
    .object({
      id: z.string().min(1),
      data: z.string().min(1).optional(),
      message: z
        .object({
          chat: z
            .object({
              id: z.union([z.string(), z.number()]).optional()
            })
            .optional()
        })
        .optional()
    })
    .optional()
});
