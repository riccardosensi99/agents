import type { Agent, Draft, Task } from "../../types/domain";
import { speechForAgent } from "../../game/agentMovement";
import type { RoomPoint } from "../../game/types";

type Props = {
  agent: Agent;
  point: RoomPoint;
  tasks: Task[];
  drafts: Draft[];
};

export function SpeechBubble({ agent, point, tasks, drafts }: Props) {
  return (
    <div
      className="pointer-events-none absolute z-20 max-w-[220px] -translate-x-1/2 -translate-y-full rounded-xl border border-cyan-300/30 bg-slate-950/88 px-3 py-2 text-xs font-medium text-cyan-50 shadow-glow backdrop-blur-md"
      style={{ left: point.x, top: point.y }}
    >
      <p className="text-[10px] uppercase tracking-wide text-cyan-200/70">{agent.name}</p>
      <p className="mt-1 leading-5">{speechForAgent(agent, tasks, drafts)}</p>
      <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-cyan-300/30 bg-slate-950/88" />
    </div>
  );
}
