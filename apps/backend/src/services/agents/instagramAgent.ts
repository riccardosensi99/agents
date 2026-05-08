import { buildInstagramPrompt } from "../../prompts/instagramPrompt";
import type { BrandProfile } from "../../types/brand";
import { generatedDraftSchema } from "../../validators/aiOutputs";
import { aiClient } from "../ai/aiClient";
import type { AgentRunContext, GeneratedDraft } from "./types";

export async function runInstagramAgent(
  prompt: string,
  brandProfile: BrandProfile | null,
  context: AgentRunContext = {}
): Promise<GeneratedDraft> {
  const builtPrompt = buildInstagramPrompt({ taskPrompt: prompt, brandProfile });
  const generated = await aiClient.generateJson(
    {
      ...builtPrompt,
      ...context,
      operation: "instagram.generate_draft",
      responseFormat: "json",
      temperature: 0.7
    },
    generatedDraftSchema
  );

  return {
    title: generated.title,
    content: generated.content,
    platform: "instagram",
    metadata: generated.metadata ?? {}
  };
}
