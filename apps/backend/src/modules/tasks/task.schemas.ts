import { z } from "zod";

export const taskParamsSchema = z.object({
  id: z.string().uuid()
});
