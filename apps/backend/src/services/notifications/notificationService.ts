import { prisma } from "../../db/prisma";

export async function createNotification(params: {
  type: string;
  title: string;
  message: string;
  meta?: Record<string, unknown>;
}) {
  await (prisma as any).systemEvent.create({
    data: {
      type: params.type,
      message: params.message,
      ...(params.meta ? { meta: params.meta } : {})
    }
  });

  return (prisma as any).notification.create({
    data: {
      type: params.type,
      title: params.title,
      message: params.message,
      ...(params.meta ? { meta: params.meta } : {})
    }
  });
}

export async function markNotificationRead(notificationId: string) {
  return (prisma as any).notification.update({
    where: { id: notificationId },
    data: {
      status: "read",
      readAt: new Date()
    }
  });
}

export async function markAllNotificationsRead() {
  const now = new Date();

  await (prisma as any).notification.updateMany({
    where: { status: "unread" },
    data: {
      status: "read",
      readAt: now
    }
  });

  return (prisma as any).notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 50
  });
}
