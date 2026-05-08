import type { Draft } from "@prisma/client";

export type LinkedInPostPayload = {
  commentary: string;
  visibility: "PUBLIC";
  lifecycleState: "PUBLISHED";
  distribution: {
    feedDistribution: "MAIN_FEED";
  };
};

export function mapDraftToLinkedInPayload(draft: Pick<Draft, "title" | "content" | "platform" | "status">): LinkedInPostPayload {
  return {
    commentary: [draft.title, "", draft.content].join("\n").trim(),
    visibility: "PUBLIC",
    lifecycleState: "PUBLISHED",
    distribution: {
      feedDistribution: "MAIN_FEED"
    }
  };
}
