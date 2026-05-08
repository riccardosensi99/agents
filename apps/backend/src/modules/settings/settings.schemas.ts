import { z } from "zod";

export const brandProfileSchema = z.object({
  ownerName: z.string().max(160).default(""),
  bio: z.string().max(4000).default(""),
  services: z.string().max(4000).default(""),
  technicalStack: z.string().max(3000).default(""),
  toneOfVoice: z.string().max(3000).default(""),
  targetClients: z.string().max(3000).default(""),
  businessGoals: z.string().max(3000).default(""),
  topicsToPush: z.string().max(3000).default(""),
  topicsToAvoid: z.string().max(3000).default(""),
  goodPostExamples: z.string().max(6000).default(""),
  bannedWords: z.string().max(3000).default("")
});

export const updateBrandProfileSchema = brandProfileSchema.partial();
