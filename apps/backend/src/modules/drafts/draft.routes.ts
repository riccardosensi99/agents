import type { DraftStatus } from "@prisma/client";
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
import { regenerateDraft } from "../../services/drafts/draftRevisionService";
import { createNotification } from "../../services/notifications/notificationService";

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

async function transitionDraft(
  draftId: string,
  userId: string | null,
  status: DraftStatus,
  action: "approve" | "reject" | "request_revision",
  comment?: string
) {
  const draft = await (prisma as any).draft.findUnique({
    where: { id: draftId },
    include: { task: true, agent: true }
  });

  if (!draft) {
    throw notFound("Draft");
  }

  const nextTaskStatus =
    status === "approved" ? "completed" : status === "rejected" ? "rejected" : "revision_requested";

  const updated = await prisma.$transaction(async (tx: any) => {
    const savedDraft = await tx.draft.update({
      where: { id: draft.id },
      data: { status }
    });

    await tx.approval.create({
      data: {
        draftId: draft.id,
        userId,
        action,
        previousStatus: draft.status,
        newStatus: status,
        comment: comment ?? null
      }
    });

    if (draft.taskId) {
      await tx.task.update({
        where: { id: draft.taskId },
        data: {
          status: nextTaskStatus,
          completedAt: status === "approved" ? new Date() : null
        }
      });

      await tx.taskEvent.create({
        data: {
          taskId: draft.taskId,
          type: `draft.${status}`,
          message: `Draft ${status}`,
          meta: { draftId: draft.id, action }
        }
      });
    }

    await tx.agent.update({
      where: { id: draft.agentId },
      data: { status: "idle" }
    });

    await tx.agentLog.create({
      data: {
        agentId: draft.agentId,
        message: `Draft ${status}`,
        meta: { draftId: draft.id, taskId: draft.taskId, action }
      }
    });

    return savedDraft;
  });

  await createNotification({
    type: `draft.${status}`,
    title: status === "approved" ? "Bozza approvata" : status === "rejected" ? "Bozza rifiutata" : "Revisione richiesta",
    message: `${draft.title}: ${comment ?? status}`,
    meta: { draftId: draft.id, taskId: draft.taskId, action }
  });

  return updated;
}

draftRoutes.post(
  "/:id/approve",
  validateParams(draftParamsSchema),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const draft = await transitionDraft(id, req.user?.id ?? null, "approved", "approve");
    res.json({ data: draft });
  })
);

draftRoutes.post(
  "/:id/reject",
  validateParams(draftParamsSchema),
  validateBody(rejectDraftSchema),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const draft = await transitionDraft(
      id,
      req.user?.id ?? null,
      "rejected",
      "reject",
      req.body.comment
    );
    res.json({ data: draft });
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
