import type { Agent, Draft, Task } from "../types/domain";

export type RoomPoint = {
  x: number;
  y: number;
};

export type RoomAgentMode =
  | "idle"
  | "walk"
  | "working"
  | "thinking"
  | "error"
  | "waiting_approval";

export type RoomAgentIntent =
  | "wander"
  | "go_workstation"
  | "go_approval"
  | "supervise"
  | "stopped_error";

export type AgentRoomSnapshot = {
  agents: Agent[];
  tasks: Task[];
  drafts: Draft[];
};

export type AgentRoomSceneCallbacks = {
  onAgentClick: (agent: Agent) => void;
  onAgentHover: (agent: Agent | null, point?: RoomPoint) => void;
  onRuntimeError?: (error: Error) => void;
};
