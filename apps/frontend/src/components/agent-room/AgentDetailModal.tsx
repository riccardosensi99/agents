import { useState } from "react";
import { ArrowUpRight, Pause, Send, X } from "lucide-react";
import type { Agent, Task } from "../../types/domain";
import { formatDate } from "../../utils/format";
import { StatusBadge } from "../StatusBadge";
import { TaskComposer } from "../TaskComposer";

type Props = {
  agent: Agent;
  onClose: () => void;
  onPause: (agentId: string) => Promise<void>;
  onOpenDetails: (agent: Agent) => void;
  onCreateTask: (agentId: string, body: { title: string; prompt: string; runNow: boolean }) => Promise<Task | void>;
};

export function AgentDetailModal({ agent, onClose, onPause, onOpenDetails, onCreateTask }: Props) {
  const [assigning, setAssigning] = useState(false);
  const metrics = agent.metrics ?? { completedTasks: 0, failedTasks: 0, draftsCreated: 0 };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/72 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/96 p-5 shadow-2xl shadow-slate-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-cyan-200/70">Agent room unit</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">{agent.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{agent.role}</p>
          </div>
          <button
            type="button"
            title="Chiudi"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-300 transition hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge kind="agent" status={agent.status} />
          <span className="inline-flex h-7 items-center rounded-full border border-white/10 bg-white/6 px-3 text-xs text-slate-300">
            Last: {formatDate(agent.lastActivity)}
          </span>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-300">{agent.description}</p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Metric label="Task completati" value={metrics.completedTasks} />
          <Metric label="Task falliti" value={metrics.failedTasks} />
          <Metric label="Bozze create" value={metrics.draftsCreated} />
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/6 p-4">
          <p className="text-xs text-slate-500">Task corrente</p>
          <p className="mt-1 text-sm font-medium text-white">{agent.currentTask?.title ?? "Nessun task attivo"}</p>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setAssigning((value) => !value)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-slate-200 transition hover:bg-white/10"
          >
            <Send size={16} />
            Assegna task
          </button>
          <button
            type="button"
            onClick={() => void onPause(agent.id)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-slate-200 transition hover:bg-white/10"
          >
            <Pause size={16} />
            Pausa
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDetails(agent);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            <ArrowUpRight size={16} />
            Apri dettagli
          </button>
        </div>

        {assigning ? (
          <div className="mt-5">
            <TaskComposer agent={agent} onCreate={(body) => onCreateTask(agent.id, body)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
