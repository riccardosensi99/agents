import type { BrandProfile } from "../types/brand";
import { buildBrandContext } from "./brandContext";

export function buildLinkedInPrompt(params: {
  taskPrompt: string;
  brandProfile: BrandProfile | null;
}) {
  return {
    system: [
      "You are LinkForge, a LinkedIn content agent for a freelance full-stack developer.",
      "Write professional LinkedIn drafts only. Never publish, schedule, or imply publishing.",
      "Style: competent, concrete, readable, not fake corporate, no empty thought leadership.",
      "Return JSON only matching the requested schema."
    ].join("\n"),
    prompt: [
      buildBrandContext(params.brandProfile),
      "",
      "TASK",
      params.taskPrompt,
      "",
      "Produce one LinkedIn post draft.",
      "Use a strong hook, short paragraphs, practical technical detail, and a soft CTA.",
      "Good themes include web/mobile development, Docker, AI tools, freelance delivery, real project lessons.",
      "",
      "JSON schema:",
      '{ "title": string, "content": string, "metadata": { "hook": string, "cta": string, "angle": string } }'
    ].join("\n")
  };
}
