import { Router } from "express";
import { env } from "../../config/env";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../lib/asyncHandler";

export const systemRoutes = Router();

systemRoutes.get(
  "/status",
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;

    const [agents, pendingTasks, runningTasks, approvalDrafts, events] = await Promise.all([
      prisma.agent.count(),
      prisma.task.count({ where: { status: "pending" } }),
      prisma.task.count({ where: { status: "running" } }),
      prisma.draft.count({ where: { status: "waiting_approval" } }),
      prisma.systemEvent.findMany({ orderBy: { createdAt: "desc" }, take: 5 })
    ]);

    res.json({
      data: {
        api: "ok",
        database: "ok",
        aiProvider: env.OPENAI_API_KEY ? "openai" : "mock",
        schedulerEnabled: env.SCHEDULER_ENABLED,
        socialPublishing: "disabled",
        uptimeSeconds: Math.round(process.uptime()),
        counts: {
          agents,
          pendingTasks,
          runningTasks,
          approvalDrafts
        },
        recentEvents: events
      }
    });
  })
);
