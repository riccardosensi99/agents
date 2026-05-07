import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AgentRoomCanvas } from "../components/agent-room/AgentRoomCanvas";
import { AgentDetailModal } from "../components/agent-room/AgentDetailModal";
import type { Agent, Draft, SystemStatus, Task } from "../types/domain";

type Props = {
  agents: Agent[];
  tasks: Task[];
  drafts: Draft[];
  status?: SystemStatus | null;
  onRefresh: () => Promise<void>;
  onOpenAgent: (agent: Agent) => void;
  onPauseAgent: (agentId: string) => Promise<void>;
  onCreateTask: (agentId: string, body: { title: string; prompt: string; runNow: boolean }) => Promise<Task | void>;
};

export function AgentRoomPage({
  agents,
  tasks,
  drafts,
  status,
  onRefresh,
  onOpenAgent,
  onPauseAgent,
  onCreateTask
}: Props) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const approvalCount = drafts.filter((draft) => draft.status === "waiting_approval").length;
  const runningCount = tasks.filter((task) => task.status === "running").length;

  const selectedLiveAgent = useMemo(() => {
    if (!selectedAgent) {
      return null;
    }

    return agents.find((agent) => agent.id === selectedAgent.id) ?? selectedAgent;
  }, [agents, selectedAgent]);

  return (
    <section className="flex h-full min-h-[calc(100vh-82px)] flex-col">
      <div className="flex flex-col gap-3 border-b border-white/10 bg-slate-950/62 px-4 py-4 backdrop-blur-xl xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs uppercase text-cyan-200/70">Pixel dev center</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Agent Dock Room</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Stat label="Agents" value={agents.length} />
          <Stat label="Running" value={runningCount} />
          <Stat label="Approvals" value={approvalCount} />
          <Stat label="AI" value={status?.aiProvider ?? "mock"} />
          <button
            type="button"
            onClick={() => void onRefresh()}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 font-medium text-slate-200 transition hover:bg-white/10"
          >
            <RefreshCw size={15} />
            Sync
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <AgentRoomCanvas
          agents={agents}
          tasks={tasks}
          drafts={drafts}
          onAgentClick={setSelectedAgent}
          onOpenAgent={onOpenAgent}
        />
      </div>

      {selectedLiveAgent ? (
        <AgentDetailModal
          agent={selectedLiveAgent}
          onClose={() => setSelectedAgent(null)}
          onPause={onPauseAgent}
          onOpenDetails={onOpenAgent}
          onCreateTask={onCreateTask}
        />
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
