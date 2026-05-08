import { Router } from "express";
import { env } from "../../config/env";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError, notFound } from "../../lib/errors";
import { validateParams } from "../../middleware/validate";
import { mapDraftToLinkedInPayload } from "../../services/social/linkedinMapper";
import { socialDraftParamsSchema } from "./social.schemas";

export const socialRoutes = Router();

const paramId = (id: string | undefined) => {
  if (!id) {
    throw new AppError(400, "Missing route id");
  }

  return id;
};

socialRoutes.post(
  "/linkedin/drafts/:id/prepare",
  validateParams(socialDraftParamsSchema),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const draft = await (prisma as any).draft.findUnique({
      where: { id }
    });

    if (!draft) {
      throw notFound("Draft");
    }

    if (draft.platform !== "linkedin") {
      throw new AppError(400, "Only LinkedIn drafts can be mapped to LinkedIn payloads");
    }

    if (draft.status !== "approved") {
      throw new AppError(409, "Only approved drafts can be prepared for LinkedIn publishing");
    }

    const payload = mapDraftToLinkedInPayload(draft);
    const attempt = await (prisma as any).publishingAttempt.create({
      data: {
        draftId: draft.id,
        provider: "linkedin",
        status: env.LINKEDIN_ENABLED ? "pending_manual" : "blocked",
        payload,
        requestedBy: req.user?.email ?? "dashboard",
        error: env.LINKEDIN_ENABLED ? null : "LinkedIn integration disabled"
      }
    });

    res.json({
      data: {
        enabled: env.LINKEDIN_ENABLED,
        payload,
        attempt,
        message: env.LINKEDIN_ENABLED
          ? "LinkedIn payload prepared. Publishing still requires manual confirmation in a future step."
          : "LinkedIn integration is disabled. No content was published."
      }
    });
  })
);
