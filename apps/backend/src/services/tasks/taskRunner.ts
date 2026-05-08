import type { Platform } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError, notFound } from "../../lib/errors";
import { getDefaultBrandProfile } from "../brand/brandProfileService";
import { createInitialDraftVersion } from "../drafts/draftVersionService";
import { createNotification } from "../notifications/notificationService";
import { runInstagramAgent } from "../agents/instagramAgent";
import { runLinkedInAgent } from "../agents/linkedinAgent";
import { reviewDraftWithSupervisor } from "../agents/supervisorAgent";
import type { GeneratedDraft } from "../agents/types";

const db = prisma as any;

async function runGenericAgent(prompt: string): Promise<GeneratedDraft> {
  return {
    title: "Internal agent output",
    content: `Internal note generated for: ${prompt}`,
    platform: "internal",
    metadata: {}
  };
}

async function addTaskEvent(taskId: string, type: string, message: string, meta?: Record<string, unknown>) {
  await db.taskEvent.create({
    data: {
      taskId,
      type,
      message,
      meta
    }
  });
}

function platformForAgent(agentSlug: string): Platform {
  if (agentSlug === "instaspark") {
    return "instagram";
  }

  if (agentSlug === "linkforge") {
    return "linkedin";
  }

  return "internal";
}

export async function runTask(taskId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { agent: true }
  });

  if (!task) {
    throw notFound("Task");
  }

  if (task.status === "running") {
    throw new AppError(409, "Task is already running");
  }

  const nextRetryCount = task.status === "failed" ? task.retryCount + 1 : task.retryCount;

  await db.$transaction([
    db.task.update({
      where: { id: task.id },
      data: {
        status: "running",
        platform: task.platform === "internal" ? platformForAgent(task.agent.slug) : task.platform,
        startedAt: new Date(),
        failedAt: null,
        error: null,
        errorMessage: null,
        retryCount: nextRetryCount
      }
    }),
    db.agent.update({
      where: { id: task.agentId },
      data: { status: "working" }
    }),
    db.agentLog.create({
      data: {
        agentId: task.agentId,
        message: "Task execution started",
        meta: { taskId: task.id, retryCount: nextRetryCount }
      }
    }),
    db.taskEvent.create({
      data: {
        taskId: task.id,
        type: "task.started",
        message: "Task execution started",
        meta: { agentSlug: task.agent.slug }
      }
    })
  ]);

  try {
    const brandProfile = await getDefaultBrandProfile();
    const generated =
      task.agent.slug === "instaspark"
        ? await runInstagramAgent(task.prompt, brandProfile)
        : task.agent.slug === "linkforge"
          ? await runLinkedInAgent(task.prompt, brandProfile)
          : await runGenericAgent(task.prompt);

    const supervisorReview =
      generated.platform === "internal"
        ? null
        : await reviewDraftWithSupervisor({
            title: generated.title,
            content: generated.content,
            platform: generated.platform,
            brandProfile
          });

    const draft = await db.draft.create({
      data: {
        agentId: task.agentId,
        taskId: task.id,
        title: generated.title,
        content: generated.content,
        platform: generated.platform,
        status: generated.platform === "internal" ? "draft" : "waiting_approval",
        supervisorScore: supervisorReview?.qualityScore ?? null,
        riskLevel: supervisorReview?.riskLevel ?? null,
        supervisorFeedback: supervisorReview?.feedback ?? null,
        recommendedAction: supervisorReview?.recommendedAction ?? null,
        currentVersion: 1
      }
    });

    await createInitialDraftVersion({
      draftId: draft.id,
      title: draft.title,
      content: draft.content,
      review: supervisorReview
    });

    const nextTaskStatus = generated.platform === "internal" ? "completed" : "waiting_approval";
    const nextAgentStatus = generated.platform === "internal" ? "idle" : "waiting_approval";

    const updatedTask = await db.task.update({
      where: { id: task.id },
      data: {
        status: nextTaskStatus,
        result: generated.content,
        resultJson: {
          draftId: draft.id,
          generated,
          supervisorReview
        },
        completedAt: generated.platform === "internal" ? new Date() : null
      }
    });

    await db.agent.update({
      where: { id: task.agentId },
      data: { status: nextAgentStatus }
    });

    await addTaskEvent(task.id, "task.draft_created", "Draft generated and saved", {
      draftId: draft.id,
      platform: generated.platform,
      recommendedAction: supervisorReview?.recommendedAction
    });

    await db.agentLog.create({
      data: {
        agentId: task.agentId,
        message: "Task execution finished",
        meta: {
          taskId: task.id,
          draftId: draft.id,
          status: nextTaskStatus,
          supervisor: supervisorReview
        }
      }
    });

    if (generated.platform !== "internal") {
      await createNotification({
        type: "draft.waiting_approval",
        title: "Bozza pronta per approvazione",
        message: `${task.agent.name} ha generato una bozza ${generated.platform}.`,
        meta: {
          taskId: task.id,
          draftId: draft.id,
          recommendedAction: supervisorReview?.recommendedAction
        }
      });

      if (supervisorReview?.recommendedAction === "revise" || supervisorReview?.recommendedAction === "reject") {
        await createNotification({
          type: `supervisor.${supervisorReview.recommendedAction}`,
          title: "Supervisor richiede attenzione",
          message: `Overseer consiglia: ${supervisorReview.recommendedAction}.`,
          meta: {
            taskId: task.id,
            draftId: draft.id,
            riskLevel: supervisorReview.riskLevel,
            qualityScore: supervisorReview.qualityScore
          }
        });
      }
    }

    return {
      task: updatedTask,
      draft,
      supervisorReview
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown task error";

    await db.$transaction([
      db.task.update({
        where: { id: task.id },
        data: {
          status: "failed",
          failedAt: new Date(),
          error: message,
          errorMessage: message
        }
      }),
      db.agent.update({
        where: { id: task.agentId },
        data: { status: "error" }
      }),
      db.agentLog.create({
        data: {
          agentId: task.agentId,
          level: "error",
          message: "Task execution failed",
          meta: { taskId: task.id, error: message }
        }
      }),
      db.taskEvent.create({
        data: {
          taskId: task.id,
          type: "task.failed",
          message: "Task execution failed",
          meta: { error: message }
        }
      })
    ]);

    await createNotification({
      type: "task.failed",
      title: "Task fallito",
      message: `${task.title}: ${message}`,
      meta: { taskId: task.id, agentId: task.agentId }
    });

    throw error;
  }
}

export async function retryTask(taskId: string) {
  const task = await db.task.findUnique({ where: { id: taskId } });

  if (!task) {
    throw notFound("Task");
  }

  if (task.status === "running") {
    throw new AppError(409, "Cannot retry a running task");
  }

  await db.task.update({
    where: { id: task.id },
    data: {
      status: "pending",
      error: null,
      errorMessage: null,
      failedAt: null
    }
  });

  await addTaskEvent(task.id, "task.retry_requested", "Task retry requested");
  return runTask(task.id);
}

export async function cancelTask(taskId: string) {
  const task = await db.task.findUnique({ where: { id: taskId } });

  if (!task) {
    throw notFound("Task");
  }

  if (task.status === "running") {
    throw new AppError(409, "Cannot cancel a running task");
  }

  const updated = await db.task.update({
    where: { id: task.id },
    data: {
      status: "rejected",
      completedAt: new Date()
    }
  });

  await addTaskEvent(task.id, "task.cancelled", "Task cancelled manually");
  return updated;
}
