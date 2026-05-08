import { Router } from "express";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError, notFound } from "../../lib/errors";
import { validateBody, validateParams } from "../../middleware/validate";
import {
  draftParamsSchema,
  regenerateDraftSchema,
  patchDraftSchema,
  rejectDraftSchema,
  revisionRequestSchema
} from "./draft.schemas";
import { createDraftVersion } from "../../services/drafts/draftVersionService";
import { applyDraftDecision } from "../../services/drafts/draftApprovalService";
import { regenerateDraft } from "../../services/drafts/draftRevisionService";

export const draftRoutes = Router();

const paramId = (id: string | undefined) => {
  if (!id) {
    throw new AppError(400, "Missing route id");
  }

  return id;
};

draftRoutes.get(
  "/",
  asyncHandler(async (_req, res) => {
    const drafts = await (prisma as any).draft.findMany({
      include: {
        agent: true,
        task: true,
        versions: { orderBy: { version: "desc" } },
        approvals: {
          include: { user: true },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ data: drafts });
  })
);

draftRoutes.patch(
  "/:id",
  validateParams(draftParamsSchema),
  validateBody(patchDraftSchema),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const draft = await (prisma as any).draft.findUnique({
      where: { id }
    });

    if (!draft) {
      throw notFound("Draft");
    }

    let nextVersion: number | undefined;
    const shouldVersion = Boolean(req.body.content || req.body.title);

    if (shouldVersion) {
      nextVersion = await createDraftVersion({
        draft,
        title: req.body.title ?? draft.title,
        content: req.body.content ?? draft.content,
        createdBy: req.user?.email ?? "manual-edit"
      });
    }

    const updated = await (prisma as any).draft.update({
      where: { id: draft.id },
      data: {
        ...req.body,
        currentVersion: nextVersion ?? draft.currentVersion
      }
    });

    if (req.body.content || req.body.title || req.body.status) {
      await prisma.approval.create({
        data: {
          draftId: draft.id,
          userId: req.user?.id ?? null,
          action: "edit",
          previousStatus: draft.status,
          newStatus: updated.status,
          comment: "Manual draft update"
        }
      });
    }

    res.json({ data: updated });
  })
);

draftRoutes.post(
  "/:id/approve",
  validateParams(draftParamsSchema),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const result = await applyDraftDecision({
      draftId: id,
      userId: req.user?.id ?? null,
      action: "approve"
    });
    res.json({ data: result.draft });
  })
);

draftRoutes.post(
  "/:id/reject",
  validateParams(draftParamsSchema),
  validateBody(rejectDraftSchema),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const result = await applyDraftDecision({
      draftId: id,
      userId: req.user?.id ?? null,
      action: "reject",
      comment: req.body.comment
    });
    res.json({ data: result.draft });
  })
);

draftRoutes.post(
  "/:id/request-revision",
  validateParams(draftParamsSchema),
  validateBody(revisionRequestSchema),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const result = await regenerateDraft({
      draftId: id,
      userId: req.user?.id ?? null,
      comment: req.body.comment,
      action: "request_revision"
    });
    res.json({ data: result });
  })
);

draftRoutes.post(
  "/:id/regenerate",
  validateParams(draftParamsSchema),
  validateBody(regenerateDraftSchema),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const result = await regenerateDraft({
      draftId: id,
      userId: req.user?.id ?? null,
      comment: req.body.comment,
      action: "regenerate"
    });
    res.json({ data: result });
  })
);
