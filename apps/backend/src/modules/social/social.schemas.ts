import { z } from "zod";

export const socialDraftParamsSchema = z.object({
  id: z.string().uuid()
});
