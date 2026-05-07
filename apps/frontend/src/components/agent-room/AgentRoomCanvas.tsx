import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import type { Agent, Draft, Task } from "../../types/domain";
import { AgentCard } from "../AgentCard";
import { SpeechBubble } from "./SpeechBubble";
import { AgentRoomScene } from "../../game/AgentRoomScene";
import type { RoomPoint } from "../../game/types";

type Props = {
  agents: Agent[];
  tasks: Task[];
  drafts: Draft[];
  onAgentClick: (agent: Agent) => void;
  onOpenAgent: (agent: Agent) => void;
};

type HoveredAgent = {
  agent: Agent;
  point: RoomPoint;
};

export function AgentRoomCanvas({ agents, tasks, drafts, onAgentClick, onOpenAgent }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<AgentRoomScene | null>(null);
  const [failed, setFailed] = useState(false);
  const [hovered, setHovered] = useState<HoveredAgent | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || gameRef.current || failed) {
      return;
    }

    try {
      const scene = new AgentRoomScene({
        onAgentClick,
        onAgentHover: (agent, point) => {
          setHovered(agent && point ? { agent, point } : null);
        },
        onRuntimeError: () => setFailed(true)
      });
      sceneRef.current = scene;

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: container,
        backgroundColor: "#020617",
        scene,
        scale: {
          mode: Phaser.Scale.RESIZE,
          parent: container,
          width: container.clientWidth,
          height: container.clientHeight
        },
        render: {
          pixelArt: true,
          antialias: false
        },
        input: {
          activePointers: 3
        }
      });
    } catch {
      setFailed(true);
    }

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, [failed, onAgentClick]);

  useEffect(() => {
    sceneRef.current?.setRoomState({ agents, tasks, drafts });
  }, [agents, tasks, drafts]);

  if (failed) {
    return (
      <div className="grid gap-4 p-4 xl:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} onOpen={onOpenAgent} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[680px] overflow-hidden rounded-none border-y border-white/10 bg-slate-950">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-2xl border border-white/10 bg-slate-950/72 px-4 py-3 backdrop-blur-md">
        <p className="text-xs uppercase text-cyan-200/70">Agent Room</p>
        <p className="mt-1 text-sm font-semibold text-white">Live dock lab</p>
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-2xl border border-white/10 bg-slate-950/72 px-4 py-3 text-xs text-slate-400 backdrop-blur-md">
        Polling dati ogni 5s. WebSocket/SSE ready come prossimo canale eventi.
      </div>
      {hovered ? <SpeechBubble agent={hovered.agent} point={hovered.point} tasks={tasks} drafts={drafts} /> : null}
    </div>
  );
}
