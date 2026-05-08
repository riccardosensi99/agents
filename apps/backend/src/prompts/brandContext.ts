import type { BrandProfile } from "../types/brand";

export function buildBrandContext(profile: BrandProfile | null) {
  if (!profile) {
    return [
      "BRAND PROFILE",
      "No brand profile has been configured yet. Ask for practical, specific output and avoid generic claims."
    ].join("\n");
  }

  return [
    "BRAND PROFILE",
    `Who: ${profile.ownerName || "Freelance full-stack developer"}`,
    `Bio: ${profile.bio || "Not specified"}`,
    `Services: ${profile.services || "Not specified"}`,
    `Technical stack: ${profile.technicalStack || "Not specified"}`,
    `Tone of voice: ${profile.toneOfVoice || "Direct, practical, human"}`,
    `Target clients: ${profile.targetClients || "Not specified"}`,
    `Business goals: ${profile.businessGoals || "Not specified"}`,
    `Topics to push: ${profile.topicsToPush || "Not specified"}`,
    `Topics to avoid: ${profile.topicsToAvoid || "Not specified"}`,
    `Good post examples: ${profile.goodPostExamples || "Not specified"}`,
    `Words or phrases to avoid: ${profile.bannedWords || "Not specified"}`
  ].join("\n");
}
