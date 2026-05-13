import type { Platform } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError, notFound } from "../../lib/errors";
import { safeErrorMessage } from "../../lib/redact";
import { getDefaultBrandProfile } from "../brand/brandProfileService";
import { createInitialDraftVersion } from "../drafts/draftVersionService";
import { buildMemoryContext, getRelevantMemories } from "../../modules/memory/memory.service";
import { createNotification } from "../notifications/notificationService";
import { notifyTelegramDraftReady } from "../telegram/telegramApprovalService";
import { runInstagramAgent } from "../agents/instagramAgent";
import { runLinkedInAgent } from "../agents/linkedinAgent";
import { reviewDraftWithSupervisor } from "../agents/supervisorAgent";
import type { GeneratedDraft } from "../agents/types";

const db = prisma as any;

async function runGenericAgent(prompt: string, memoryContext?: string): Promise<GeneratedDraft> {
  return {
    title: "Internal agent output",
    content: [`Internal note generated for: ${prompt}`, "", memoryContext ?? ""].filter(Boolean).join("\n"),
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

const runnableStatuses = ["pending", "failed", "rejected", "revision_requested"] as const;

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

  if (!runnableStatuses.includes(task.status)) {
    throw new AppError(409, `Task cannot be run from status ${task.status}`);
  }

  const nextRetryCount = task.status === "failed" ? task.retryCount + 1 : task.retryCount;
  const startedAt = new Date();
  const platform = task.platform === "internal" ? platformForAgent(task.agent.slug) : task.platform;
  const locked = await db.task.updateMany({
    where: {
      id: task.id,
      status: { in: runnableStatuses }
    },
    data: {
      status: "running",
      platform,
      startedAt,
      completedAt: null,
      failedAt: null,
      error: null,
      errorMessage: null,
      retryCount: nextRetryCount
    }
  });

  if (locked.count !== 1) {
    throw new AppError(409, "Task was already picked up by another runner");
  }

  await db.$transaction([
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
        meta: { agentSlug: task.agent.slug, retryCount: nextRetryCount }
      }
    })
  ]);

  console.info("task.run.started", {
    taskId: task.id,
    agentSlug: task.agent.slug,
    platform,
    retryCount: nextRetryCount
  });

  try {
    const brandProfile = await getDefaultBrandProfile();
    const memories = await getRelevantMemories({
      prompt: task.prompt,
      platform,
      agentSlug: task.agent.slug,
      limit: 8
    });
    const memoryContext = buildMemoryContext(memories);
    const aiContext = {
      taskId: task.id,
      agentSlug: task.agent.slug
    };
    const generated =
      task.agent.slug === "instaspark"
        ? await runInstagramAgent(task.prompt, brandProfile, aiContext, memoryContext)
        : task.agent.slug === "linkforge"
          ? await runLinkedInAgent(task.prompt, brandProfile, aiContext, memoryContext)
          : await runGenericAgent(task.prompt, memoryContext);

    const supervisorReview =
      generated.platform === "internal"
        ? null
        : await reviewDraftWithSupervisor({
            title: generated.title,
            content: generated.content,
            platform: generated.platform,
            brandProfile,
            memoryContext,
            context: aiContext
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
          supervisorReview,
          memoryIds: memories.map((memory) => memory.id)
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
      recommendedAction: supervisorReview?.recommendedAction,
      memoryIds: memories.map((memory) => memory.id)
    });

    await db.agentLog.create({
      data: {
        agentId: task.agentId,
        message: "Task execution finished",
        meta: {
          taskId: task.id,
          draftId: draft.id,
          status: nextTaskStatus,
          supervisor: supervisorReview,
          memoryIds: memories.map((memory) => memory.id)
        }
      }
    });

    console.info("task.run.completed", {
      taskId: task.id,
      agentSlug: task.agent.slug,
      status: nextTaskStatus,
      draftId: draft.id,
      durationMs: Date.now() - startedAt.getTime()
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

      await notifyTelegramDraftReady(draft.id).catch((error) => {
        console.warn("telegram.draft_notification_failed", {
          draftId: draft.id,
          message: error instanceof Error ? error.message : "unknown"
        });
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
    const message = safeErrorMessage(error, "Unknown task error");

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

    console.warn("task.run.failed", {
      taskId: task.id,
      agentSlug: task.agent.slug,
      durationMs: Date.now() - startedAt.getTime(),
      error: message
    });

    throw error;
  }
}

export async function retryTask(taskId: string) {
  const task = await db.task.findUnique({ where: { id: taskId } });

  if (!task) {
    throw notFound("Task");
  }

  if (task.status !== "failed") {
    throw new AppError(409, "Only failed tasks can be retried");
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

  if (task.status !== "pending") {
    throw new AppError(409, "Only pending tasks can be cancelled");
  }

  const updated = await db.task.update({
    where: { id: task.id },
    data: {
      status: "rejected",
      completedAt: new Date(),
      error: null,
      errorMessage: null
    }
  });

  await addTaskEvent(task.id, "task.cancelled", "Task cancelled manually");
  console.info("task.cancelled", { taskId: task.id });
  return updated;
}
