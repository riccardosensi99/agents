import { prisma } from "../../db/prisma";
import type { BrandProfile } from "../../types/brand";

export type BrandProfileInput = Pick<
  BrandProfile,
  | "ownerName"
  | "bio"
  | "services"
  | "technicalStack"
  | "toneOfVoice"
  | "targetClients"
  | "businessGoals"
  | "topicsToPush"
  | "topicsToAvoid"
  | "goodPostExamples"
  | "bannedWords"
>;

const emptyProfile = (): BrandProfileInput => ({
  ownerName: "",
  bio: "",
  services: "",
  technicalStack: "",
  toneOfVoice: "",
  targetClients: "",
  businessGoals: "",
  topicsToPush: "",
  topicsToAvoid: "",
  goodPostExamples: "",
  bannedWords: ""
});

export async function getOrCreateBrandProfile(userId: string) {
  return (prisma as any).brandProfile.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      ...emptyProfile()
    }
  });
}

export async function updateBrandProfile(userId: string, input: Partial<BrandProfileInput>) {
  await getOrCreateBrandProfile(userId);

  return (prisma as any).brandProfile.update({
    where: { userId },
    data: input
  });
}

export async function getDefaultBrandProfile() {
  const profile = await (prisma as any).brandProfile.findFirst({
    orderBy: { createdAt: "asc" }
  });

  if (profile) {
    return profile;
  }

  const owner = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });

  if (!owner) {
    return null;
  }

  return getOrCreateBrandProfile(owner.id);
}
