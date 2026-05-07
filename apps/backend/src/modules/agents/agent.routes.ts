import { Router } from "express";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError, notFound } from "../../lib/errors";
import { validateBody, validateParams } from "../../middleware/validate";
import {
  agentParamsSchema,
  createAgentSchema,
  createAgentTaskSchema,
  updateAgentSchema
} from "./agent.schemas";
import { serializeAgent } from "./agent.serializer";

export const agentRoutes = Router();

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

async function uniqueSlug(name: string, requestedSlug?: string) {
  const base = requestedSlug ?? slugify(name);
  let candidate = base;
  let suffix = 2;

  while (await prisma.agent.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

agentRoutes.get(
  "/",
  asyncHandler(async (_req, res) => {
    const agents = await prisma.agent.findMany({
      include: {
        tasks: { orderBy: { createdAt: "desc" }, take: 20 },
        drafts: { orderBy: { createdAt: "desc" }, take: 20 },
        logs: { orderBy: { createdAt: "desc" }, take: 5 }
      },
      orderBy: { createdAt: "asc" }
    });

    res.json({ data: agents.map(serializeAgent) });
  })
);

agentRoutes.get(
  "/:id",
  validateParams(agentParamsSchema),
  asyncHandler(async (req, res) => {
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.id },
      include: {
        tasks: { orderBy: { createdAt: "desc" }, take: 50 },
        drafts: { orderBy: { createdAt: "desc" }, take: 50 },
        logs: { orderBy: { createdAt: "desc" }, take: 100 }
      }
    });

    if (!agent) {
      throw notFound("Agent");
    }

    res.json({ data: serializeAgent(agent) });
  })
);

agentRoutes.post(
  "/",
  validateBody(createAgentSchema),
  asyncHandler(async (req, res) => {
    const slug = await uniqueSlug(req.body.name, req.body.slug);

    const agent = await prisma.agent.create({
      data: {
        name: req.body.name,
        slug,
        role: req.body.role,
        description: req.body.description,
        status: req.body.status ?? "idle",
        avatarType: req.body.avatarType,
        config: req.body.config
      }
    });

    await prisma.agentLog.create({
      data: {
        agentId: agent.id,
        message: "Agent created",
        meta: { createdBy: req.user?.email ?? "system" }
      }
    });

    res.status(201).json({ data: agent });
  })
);

agentRoutes.patch(
  "/:id",
  validateParams(agentParamsSchema),
  validateBody(updateAgentSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.agent.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      throw notFound("Agent");
    }

    if (req.body.slug && req.body.slug !== existing.slug) {
      const duplicated = await prisma.agent.findUnique({ where: { slug: req.body.slug } });
      if (duplicated) {
        throw new AppError(409, "Slug already in use");
      }
    }

    const agent = await prisma.agent.update({
      where: { id: req.params.id },
      data: req.body
    });

    await prisma.agentLog.create({
      data: {
        agentId: agent.id,
        message: "Agent updated",
        meta: { updatedBy: req.user?.email ?? "system" }
      }
    });

    res.json({ data: agent });
  })
);

agentRoutes.post(
  "/:id/tasks",
  validateParams(agentParamsSchema),
  validateBody(createAgentTaskSchema),
  asyncHandler(async (req, res) => {
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.id }
    });

    if (!agent) {
      throw notFound("Agent");
    }

    const task = await prisma.task.create({
      data: {
        agentId: agent.id,
        title: req.body.title,
        prompt: req.body.prompt
      }
    });

    await prisma.agentLog.create({
      data: {
        agentId: agent.id,
        message: "Manual task assigned",
        meta: { taskId: task.id, assignedBy: req.user?.email ?? "system" }
      }
    });

    res.status(201).json({ data: task });
  })
);
