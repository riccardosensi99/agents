import type { ApprovalAction, DraftStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError, notFound } from "../../lib/errors";
import { createNotification } from "../notifications/notificationService";

const db = prisma as any;

type DraftDecisionAction = Extract<ApprovalAction, "approve" | "reject" | "request_revision">;

type ChannelSource = "telegram" | "discord";

const isChannelSource = (source?: string): source is ChannelSource =>
  source === "telegram" || source === "discord";

const channelActionModel: Record<ChannelSource, "telegramApprovalAction" | "discordApprovalAction"> = {
  telegram: "telegramApprovalAction",
  discord: "discordApprovalAction"
};

type ApplyDraftDecisionParams = {
  draftId: string;
  userId: string | null;
  action: DraftDecisionAction;
  comment?: string;
  source?: "dashboard" | "telegram" | "discord";
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
};

const statusForAction = (action: DraftDecisionAction): DraftStatus =>
  action === "approve" ? "approved" : action === "reject" ? "rejected" : "revision_requested";

export async function applyDraftDecision(params: ApplyDraftDecisionParams) {
  if (params.idempotencyKey && isChannelSource(params.source)) {
    const delegate = db[channelActionModel[params.source]];
    const existingAction = await delegate.findUnique({
      where: { callbackId: params.idempotencyKey },
      include: { draft: true }
    });

    if (existingAction) {
      return {
        draft: existingAction.draft,
        idempotent: true,
        ignored: existingAction.status.startsWith("ignored")
      };
    }
  }

  const draft = await db.draft.findUnique({
    where: { id: params.draftId },
    include: { task: true, agent: true }
  });

  if (!draft) {
    throw notFound("Draft");
  }

  const nextStatus = statusForAction(params.action);

  if (isChannelSource(params.source) && draft.status !== "waiting_approval") {
    if (params.idempotencyKey) {
      await db[channelActionModel[params.source]].create({
        data: {
          draftId: draft.id,
          callbackId: params.idempotencyKey,
          action: params.action,
          status: "ignored_already_processed",
          message: `Draft already ${draft.status}`,
          ...(params.payload ? { payload: params.payload } : {})
        }
      });
    }

    return {
      draft,
      idempotent: false,
      ignored: true
    };
  }

  if (params.action === "approve" && draft.status === "approved") {
    return { draft, idempotent: true, ignored: false };
  }

  if (params.action === "reject" && draft.status === "rejected") {
    return { draft, idempotent: true, ignored: false };
  }

  if (draft.status === "approved" && params.action !== "approve") {
    throw new AppError(409, "Approved drafts cannot be changed by this action");
  }

  const nextTaskStatus =
    nextStatus === "approved" ? "completed" : nextStatus === "rejected" ? "rejected" : "revision_requested";

  const updated = await db.$transaction(async (tx: any) => {
    const savedDraft = await tx.draft.update({
      where: { id: draft.id },
      data: { status: nextStatus }
    });

    await tx.approval.create({
      data: {
        draftId: draft.id,
        userId: params.userId,
        action: params.action,
        previousStatus: draft.status,
        newStatus: nextStatus,
        comment: params.comment ?? null
      }
    });

    if (isChannelSource(params.source) && params.idempotencyKey) {
      await tx[channelActionModel[params.source]].create({
        data: {
          draftId: draft.id,
          callbackId: params.idempotencyKey,
          action: params.action,
          status: "applied",
          message: params.comment ?? null,
          ...(params.payload ? { payload: params.payload } : {})
        }
      });
    }

    if (draft.taskId) {
      await tx.task.update({
        where: { id: draft.taskId },
        data: {
          status: nextTaskStatus,
          completedAt: nextStatus === "approved" ? new Date() : null
        }
      });

      await tx.taskEvent.create({
        data: {
          taskId: draft.taskId,
          type: `draft.${nextStatus}`,
          message: `Draft ${nextStatus}`,
          meta: { draftId: draft.id, action: params.action, source: params.source ?? "dashboard" }
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
        message: `Draft ${nextStatus}`,
        meta: { draftId: draft.id, taskId: draft.taskId, action: params.action, source: params.source ?? "dashboard" }
      }
    });

    return savedDraft;
  });

  await createNotification({
    type: `draft.${nextStatus}`,
    title: nextStatus === "approved" ? "Bozza approvata" : nextStatus === "rejected" ? "Bozza rifiutata" : "Revisione richiesta",
    message: `${draft.title}: ${params.comment ?? nextStatus}`,
    meta: { draftId: draft.id, taskId: draft.taskId, action: params.action, source: params.source ?? "dashboard" }
  });

  return {
    draft: updated,
    idempotent: false,
    ignored: false
  };
}
