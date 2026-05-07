import { aiClient } from "../ai/aiClient";
import type { GeneratedDraft } from "./types";

export async function runLinkedInAgent(prompt: string): Promise<GeneratedDraft> {
  const content = await aiClient.generateText({
    system:
      "You are LinkForge, a LinkedIn growth agent for a freelance full-stack developer. Write professional draft content only. Never publish or imply automatic publication.",
    prompt,
    temperature: 0.55
  });

  return {
    title: "LinkedIn content draft",
    content,
    platform: "linkedin"
  };
}
