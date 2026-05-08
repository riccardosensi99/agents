export type BrandProfile = {
  id?: string;
  userId?: string;
  ownerName: string;
  bio: string;
  services: string;
  technicalStack: string;
  toneOfVoice: string;
  targetClients: string;
  businessGoals: string;
  topicsToPush: string;
  topicsToAvoid: string;
  goodPostExamples: string;
  bannedWords: string;
  createdAt?: Date;
  updatedAt?: Date;
};
