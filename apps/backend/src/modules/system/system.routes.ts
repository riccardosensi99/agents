import { Router } from "express";
import { aiProvider, env } from "../../config/env";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { markAllNotificationsRead, markNotificationRead } from "../../services/notifications/notificationService";

export const systemRoutes = Router();

systemRoutes.get(
  "/status",
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;

    const [agents, pendingTasks, runningTasks, failedTasks, approvalDrafts, unreadNotifications, events] = await Promise.all([
      prisma.agent.count(),
      prisma.task.count({ where: { status: "pending" } }),
      prisma.task.count({ where: { status: "running" } }),
      prisma.task.count({ where: { status: "failed" } }),
      prisma.draft.count({ where: { status: "waiting_approval" } }),
      (prisma as any).notification.count({ where: { status: "unread" } }),
      prisma.systemEvent.findMany({ orderBy: { createdAt: "desc" }, take: 5 })
    ]);

    res.json({
      data: {
        api: "ok",
        database: "ok",
        aiProvider,
        schedulerEnabled: env.SCHEDULER_ENABLED,
        socialPublishing: "disabled",
        uptimeSeconds: Math.round(process.uptime()),
        counts: {
          agents,
          pendingTasks,
          runningTasks,
          failedTasks,
          approvalDrafts
        },
        unreadNotifications,
        telegram: {
          enabled: env.TELEGRAM_ENABLED,
          configured: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID && env.TELEGRAM_WEBHOOK_SECRET)
        },
        discord: {
          enabled: env.DISCORD_ENABLED,
          configured: Boolean(env.DISCORD_BOT_TOKEN && env.DISCORD_CHANNEL_ID && env.DISCORD_PUBLIC_KEY)
        },
        linkedin: {
          enabled: env.LINKEDIN_ENABLED,
          configured: Boolean(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET && env.LINKEDIN_REDIRECT_URI)
        },
        recentEvents: events
      }
    });
  })
);

systemRoutes.get(
  "/notifications",
  asyncHandler(async (_req, res) => {
    const notifications = await (prisma as any).notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 50
    });

    res.json({ data: notifications });
  })
);

systemRoutes.post(
  "/notifications/read-all",
  asyncHandler(async (_req, res) => {
    const notifications = await markAllNotificationsRead();
    res.json({ data: notifications });
  })
);

systemRoutes.post(
  "/notifications/:id/read",
  asyncHandler(async (req, res) => {
    const id = req.params.id;

    if (!id) {
      throw new AppError(400, "Missing notification id");
    }

    const notification = await markNotificationRead(id);
    res.json({ data: notification });
  })
);
