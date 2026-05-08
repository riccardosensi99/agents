import Phaser from "phaser";
import type { Agent, Draft, Task } from "../types/domain";
import { randomPointInZone, stationPointForAgent, type RoomZones } from "./roomConfig";
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
    const inspectableAgents = params.otherAgents.filter((agent) => agent.slug !== "overseer");
    const socialAgent = Phaser.Utils.Array.GetRandom(inspectableAgents);
    if (socialAgent && Phaser.Math.Between(0, 100) < 68) {
      return {
        x: socialAgent.point.x + Phaser.Math.Between(-58, 58),
        y: socialAgent.point.y + Phaser.Math.Between(-38, 38)
      };
    }

    return Phaser.Math.Between(0, 100) < 72 ? randomPointInZone(params.zones.supervisorArea, 34) : randomPointInZone(params.zones.wander, 42);
  }

  if (params.agent.slug === "instaspark") {
    const roll = Phaser.Math.Between(0, 100);

    if (roll < 62) {
      return randomPointInZone(params.zones.socialArea, 22);
    }

    if (roll < 82) {
      return randomPointInZone(params.zones.approvalBoard, 46);
    }

    return randomPointInZone(params.zones.wander, 38);
  }

  if (params.agent.slug === "linkforge") {
    const roll = Phaser.Math.Between(0, 100);

    if (roll < 70) {
      return randomPointInZone(params.zones.devStation, 24);
    }

    if (roll < 84) {
      return randomPointInZone(params.zones.serverRack, 30);
    }

    if (roll < 93) {
      return null;
    }

    return randomPointInZone(params.zones.wander, 42);
  }

  return Phaser.Math.Between(0, 100) < 26 ? null : randomPointInZone(params.zones.wander, 38);
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
