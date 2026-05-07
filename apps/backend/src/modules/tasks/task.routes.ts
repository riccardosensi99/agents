import { Router } from "express";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError, notFound } from "../../lib/errors";
import { validateParams } from "../../middleware/validate";
import { runTask } from "../../services/tasks/taskRunner";
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
    const tasks = await prisma.task.findMany({
      include: {
        agent: true,
        drafts: true
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
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        agent: true,
        drafts: true
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
