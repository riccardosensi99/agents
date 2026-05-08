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
