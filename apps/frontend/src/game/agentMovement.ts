import Phaser from "phaser";
import type { Agent, Draft, Task } from "../types/domain";
import { randomPointInZone, stationPointForAgent, zoneCenter, type RoomZones } from "./roomConfig";
import type { RoomAgentIntent, RoomAgentMode, RoomPoint } from "./types";

export function getAgentIntent(agent: Agent, tasks: Task[], drafts: Draft[]): RoomAgentIntent {
  if (agent.status === "error") {
    return "stopped_error";
  }

  const agentTasks = tasks.filter((task) => task.agentId === agent.id);
  const agentDrafts = drafts.filter((draft) => draft.agentId === agent.id);

  if (agentTasks.some((task) => task.status === "running") || agent.status === "working") {
    return "go_workstation";
  }

  if (
    agent.status === "waiting_approval" ||
    agentTasks.some((task) => task.status === "waiting_approval") ||
    agentDrafts.some((draft) => draft.status === "waiting_approval")
  ) {
    return "go_approval";
  }

  if (agent.slug === "overseer") {
    return "supervise";
  }

  return "wander";
}

export function modeForIntent(intent: RoomAgentIntent, moving: boolean): RoomAgentMode {
  if (intent === "stopped_error") {
    return "error";
  }

  if (intent === "go_workstation") {
    return moving ? "walk" : "working";
  }

  if (intent === "go_approval") {
    return moving ? "walk" : "waiting_approval";
  }

  if (intent === "supervise") {
    return moving ? "walk" : "thinking";
  }

  return moving ? "walk" : "idle";
}

export function selectTarget(params: {
  agent: Agent;
  intent: RoomAgentIntent;
  zones: RoomZones;
  otherAgents: Array<{ slug: string; point: RoomPoint }>;
}): RoomPoint | null {
  if (params.intent === "stopped_error") {
    return null;
  }

  if (params.intent === "go_workstation") {
    return stationPointForAgent(params.agent.slug, params.zones);
  }

  if (params.intent === "go_approval") {
    return randomPointInZone(params.zones.approvalBoard, 44);
  }

  if (params.intent === "supervise") {
    const socialAgent = params.otherAgents.find((agent) => agent.slug !== "overseer");
    if (socialAgent) {
      return {
        x: socialAgent.point.x + Phaser.Math.Between(-58, 58),
        y: socialAgent.point.y + Phaser.Math.Between(-38, 38)
      };
    }

    return zoneCenter(params.zones.supervisorArea);
  }

  if (params.agent.slug === "instaspark") {
    return randomPointInZone(params.zones.socialArea, 36);
  }

  if (params.agent.slug === "linkforge") {
    return randomPointInZone(params.zones.devStation, 36);
  }

  return randomPointInZone(params.zones.wander, 38);
}

export function speechForAgent(agent: Agent, tasks: Task[], drafts: Draft[]) {
  const intent = getAgentIntent(agent, tasks, drafts);

  if (intent === "go_workstation") {
    return "Sto generando una bozza...";
  }

  if (intent === "go_approval") {
    return "Aspetto approvazione";
  }

  if (intent === "stopped_error") {
    return "Warning: serve controllo";
  }

  if (agent.slug === "overseer") {
    return "Supervisor check in corso";
  }

  return "Nessun task attivo";
}
