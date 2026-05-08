import { Router } from "express";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError, notFound } from "../../lib/errors";
import { validateParams } from "../../middleware/validate";
import { cancelTask, retryTask, runTask } from "../../services/tasks/taskRunner";
import { taskParamsSchema } from "./task.schemas";

export const taskRoutes = Router();

const paramId = (id: string | undefined) => {
  if (!id) {
    throw new AppError(400, "Missing route id");
  }

  return id;
};

taskRoutes.get(
  "/",
  asyncHandler(async (_req, res) => {
    const tasks = await (prisma as any).task.findMany({
      include: {
        agent: true,
        drafts: true,
        events: { orderBy: { createdAt: "desc" }, take: 20 }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ data: tasks });
  })
);

taskRoutes.get(
  "/:id",
  validateParams(taskParamsSchema),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const task = await (prisma as any).task.findUnique({
      where: { id },
      include: {
        agent: true,
        drafts: true,
        events: { orderBy: { createdAt: "desc" } }
      }
    });

    if (!task) {
      throw notFound("Task");
    }

    res.json({ data: task });
  })
);

taskRoutes.post(
  "/:id/run",
  validateParams(taskParamsSchema),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const result = await runTask(id);
    res.json({ data: result });
  })
);

taskRoutes.post(
  "/:id/retry",
  validateParams(taskParamsSchema),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const result = await retryTask(id);
    res.json({ data: result });
  })
);

taskRoutes.post(
  "/:id/cancel",
  validateParams(taskParamsSchema),
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const task = await cancelTask(id);
    res.json({ data: task });
  })
);
