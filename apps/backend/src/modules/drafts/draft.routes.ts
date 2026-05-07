import type { DraftStatus } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError, notFound } from "../../lib/errors";
import { validateBody, validateParams } from "../../middleware/validate";
import {
  draftParamsSchema,
  patchDraftSchema,
  rejectDraftSchema,
  revisionRequestSchema
} from "./draft.schemas";

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
    const drafts = await prisma.draft.findMany({
      include: {
        agent: true,
        task: true,
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
    const draft = await prisma.draft.findUnique({
      where: { id }
    });

    if (!draft) {
      throw notFound("Draft");
    }

    const updated = await prisma.draft.update({
      where: { id: draft.id },
      data: req.body
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
  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    include: { task: true, agent: true }
  });

  if (!draft) {
    throw notFound("Draft");
  }

  const nextTaskStatus =
    status === "approved" ? "completed" : status === "rejected" ? "rejected" : "pending";

  const updated = await prisma.$transaction(async (tx) => {
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
        data: { status: nextTaskStatus }
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
    const draft = await transitionDraft(
      id,
      req.user?.id ?? null,
      "revision_requested",
      "request_revision",
      req.body.comment
    );
    res.json({ data: draft });
  })
);
