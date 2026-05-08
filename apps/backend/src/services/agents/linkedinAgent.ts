import { buildLinkedInPrompt } from "../../prompts/linkedinPrompt";
import type { BrandProfile } from "../../types/brand";
import { generatedDraftSchema } from "../../validators/aiOutputs";
import { aiClient } from "../ai/aiClient";
import type { GeneratedDraft } from "./types";

export async function runLinkedInAgent(prompt: string, brandProfile: BrandProfile | null): Promise<GeneratedDraft> {
  const builtPrompt = buildLinkedInPrompt({ taskPrompt: prompt, brandProfile });
  const generated = await aiClient.generateJson(
    {
      ...builtPrompt,
      operation: "linkedin.generate_draft",
      responseFormat: "json",
      temperature: 0.55
    },
    generatedDraftSchema
  );

  return {
    title: generated.title,
    content: generated.content,
    platform: "linkedin",
    metadata: generated.metadata ?? {}
  };
}
