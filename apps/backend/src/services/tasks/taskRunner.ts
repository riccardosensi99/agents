import { prisma } from "../../db/prisma";
import { AppError, notFound } from "../../lib/errors";
import { runInstagramAgent } from "../agents/instagramAgent";
import { runLinkedInAgent } from "../agents/linkedinAgent";
import { reviewDraftWithSupervisor } from "../agents/supervisorAgent";
import type { GeneratedDraft } from "../agents/types";

async function runGenericAgent(prompt: string): Promise<GeneratedDraft> {
  return {
    title: "Internal agent output",
    content: `Internal note generated for: ${prompt}`,
    platform: "internal"
  };
}

export async function runTask(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { agent: true }
  });

  if (!task) {
    throw notFound("Task");
  }

  if (task.status === "running") {
    throw new AppError(409, "Task is already running");
  }

  await prisma.$transaction([
    prisma.task.update({
      where: { id: task.id },
      data: { status: "running", error: null }
    }),
    prisma.agent.update({
      where: { id: task.agentId },
      data: { status: "working" }
    }),
    prisma.agentLog.create({
      data: {
        agentId: task.agentId,
        message: "Task execution started",
        meta: { taskId: task.id }
      }
    })
  ]);

  try {
    const generated =
      task.agent.slug === "instaspark"
        ? await runInstagramAgent(task.prompt)
        : task.agent.slug === "linkforge"
          ? await runLinkedInAgent(task.prompt)
          : await runGenericAgent(task.prompt);

    const supervisorReview =
      generated.platform === "internal"
        ? null
        : await reviewDraftWithSupervisor({
            title: generated.title,
            content: generated.content,
            platform: generated.platform
          });

    const draft = await prisma.draft.create({
      data: {
        agentId: task.agentId,
        taskId: task.id,
        title: generated.title,
        content: generated.content,
        platform: generated.platform,
        status: generated.platform === "internal" ? "draft" : "waiting_approval",
        supervisorScore: supervisorReview?.qualityScore,
        riskLevel: supervisorReview?.riskLevel,
        supervisorFeedback: supervisorReview?.feedback,
        recommendedAction: supervisorReview?.recommendedAction
      }
    });

    const nextTaskStatus = generated.platform === "internal" ? "completed" : "waiting_approval";
    const nextAgentStatus = generated.platform === "internal" ? "idle" : "waiting_approval";

    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: {
        status: nextTaskStatus,
        result: generated.content
      }
    });

    await prisma.agent.update({
      where: { id: task.agentId },
      data: { status: nextAgentStatus }
    });

    await prisma.agentLog.create({
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

    return {
      task: updatedTask,
      draft,
      supervisorReview
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown task error";

    await prisma.$transaction([
      prisma.task.update({
        where: { id: task.id },
        data: { status: "failed", error: message }
      }),
      prisma.agent.update({
        where: { id: task.agentId },
        data: { status: "error" }
      }),
      prisma.agentLog.create({
        data: {
          agentId: task.agentId,
          level: "error",
          message: "Task execution failed",
          meta: { taskId: task.id, error: message }
        }
      })
    ]);

    throw error;
  }
}
