import { aiClient } from "../ai/aiClient";
import type { GeneratedDraft } from "./types";

export async function runInstagramAgent(prompt: string): Promise<GeneratedDraft> {
  const content = await aiClient.generateText({
    system:
      "You are InstaSpark, an Instagram content agent for a freelance full-stack developer. Generate draft ideas and captions only. Never publish or imply automatic publication.",
    prompt,
    temperature: 0.7
  });

  return {
    title: "Instagram content draft",
    content,
    platform: "instagram"
  };
}
