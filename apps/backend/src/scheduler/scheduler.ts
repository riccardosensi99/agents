import type { ScheduledTask } from "node-cron";
import cron from "node-cron";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { runTask } from "../services/tasks/taskRunner";

const jobs: ScheduledTask[] = [];

async function createScheduledTask(agentSlug: string, title: string, prompt: string) {
  const agent = await prisma.agent.findUnique({ where: { slug: agentSlug } });

  if (!agent) {
    await prisma.systemEvent.create({
      data: {
        level: "warn",
        type: "scheduler.agent_missing",
        message: `Scheduled agent ${agentSlug} was not found`
      }
    });
    return;
  }

  const task = await (prisma as any).task.create({
    data: {
      agentId: agent.id,
      title,
      prompt,
      platform: agent.slug === "instaspark" ? "instagram" : agent.slug === "linkforge" ? "linkedin" : "internal",
      priority: "normal",
      scheduledAt: new Date()
    }
  });

  await prisma.systemEvent.create({
    data: {
      type: "scheduler.task_created",
      message: `Scheduled task created for ${agent.name}`,
      meta: { taskId: task.id, agentSlug }
    }
  });

  await runTask(task.id);
}

export function startScheduler() {
  if (!env.SCHEDULER_ENABLED) {
    console.info("scheduler.disabled");
    return;
  }

  if (!cron.validate(env.INSTAGRAM_CRON) || !cron.validate(env.LINKEDIN_CRON)) {
    throw new Error("Invalid scheduler cron expression");
  }

  console.info("scheduler.starting", {
    instagramCron: env.INSTAGRAM_CRON,
    linkedinCron: env.LINKEDIN_CRON
  });

  jobs.push(
    cron.schedule(env.INSTAGRAM_CRON, () => {
      void createScheduledTask(
        "instaspark",
        "Scheduled Instagram draft",
        "Genera 3 idee post Instagram per promuovere servizi freelance full-stack."
      );
    })
  );

  jobs.push(
    cron.schedule(env.LINKEDIN_CRON, () => {
      void createScheduledTask(
        "linkforge",
        "Scheduled LinkedIn draft",
        "Scrivi un post LinkedIn utile per clienti B2B su sviluppo web, Docker e deploy affidabili."
      );
    })
  );
}

export function stopScheduler() {
  for (const job of jobs) {
    job.stop();
  }

  if (jobs.length > 0) {
    console.info("scheduler.stopped", { jobs: jobs.length });
  }
}
