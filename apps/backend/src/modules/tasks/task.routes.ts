import { Router } from "express";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { notFound } from "../../lib/errors";
import { validateParams } from "../../middleware/validate";
import { runTask } from "../../services/tasks/taskRunner";
import { taskParamsSchema } from "./task.schemas";

export const taskRoutes = Router();

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
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
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
    const result = await runTask(req.params.id);
    res.json({ data: result });
  })
);
