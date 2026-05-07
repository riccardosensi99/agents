import type { Agent, AgentLog, Draft, Task } from "@prisma/client";

export type AgentWithActivity = Agent & {
  tasks: Task[];
  drafts: Draft[];
  logs: AgentLog[];
};

export function serializeAgent(agent: AgentWithActivity) {
  const completedTasks = agent.tasks.filter((task) => task.status === "completed").length;
  const failedTasks = agent.tasks.filter((task) => task.status === "failed").length;
  const currentTask =
    agent.tasks.find((task) => ["pending", "running", "waiting_approval"].includes(task.status)) ??
    null;
  const lastLog = agent.logs[0] ?? null;

  return {
    id: agent.id,
    name: agent.name,
    slug: agent.slug,
    role: agent.role,
    description: agent.description,
    status: agent.status,
    avatarType: agent.avatarType,
    config: agent.config,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    lastActivity: lastLog?.createdAt ?? agent.updatedAt,
    currentTask,
    metrics: {
      completedTasks,
      failedTasks,
      draftsCreated: agent.drafts.length
    },
    recentLogs: agent.logs,
    recentTasks: agent.tasks,
    recentDrafts: agent.drafts
  };
}
