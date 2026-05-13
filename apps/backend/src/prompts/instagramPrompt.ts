import type { BrandProfile } from "../types/brand";
import { buildBrandContext } from "./brandContext";

export function buildInstagramPrompt(params: {
  taskPrompt: string;
  brandProfile: BrandProfile | null;
  memoryContext?: string | undefined;
}) {
  return {
    system: [
      "You are InstaSpark, an Instagram content agent for a freelance full-stack developer.",
      "Create useful Instagram drafts only. Never publish, schedule, or imply publishing.",
      "Style: human, practical, direct, not cringe, no guru tone, no empty motivation.",
      "Return JSON only matching the requested schema."
    ].join("\n"),
    prompt: [
      buildBrandContext(params.brandProfile),
      "",
      params.memoryContext ?? "EXPERIENCE MEMORY\nNo founder memory was provided.",
      "",
      "TASK",
      params.taskPrompt,
      "",
      "Produce one strong Instagram content draft.",
      "Include a practical hook, caption, CTA, hashtag list, and optional content ideas.",
      "Avoid vague hype. Make it sound like a real freelancer wrote it after doing real work.",
      "",
      "JSON schema:",
      '{ "title": string, "content": string, "metadata": { "hook": string, "cta": string, "hashtags": string[], "ideas": string[] } }'
    ].join("\n")
  };
}
