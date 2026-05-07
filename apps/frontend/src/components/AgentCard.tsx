import { motion } from "framer-motion";
import { ArrowUpRight, CheckCircle2, FileText, XCircle } from "lucide-react";
import type { Agent } from "../types/domain";
import { formatDate } from "../utils/format";
import { CreatureAvatar } from "./CreatureAvatar";
import { StatusBadge } from "./StatusBadge";

type Props = {
  agent: Agent;
  onOpen: (agent: Agent) => void;
};

export function AgentCard({ agent, onOpen }: Props) {
  const metrics = agent.metrics ?? { completedTasks: 0, failedTasks: 0, draftsCreated: 0 };

  return (
    <motion.article
      layout
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/8 p-5 shadow-2xl shadow-slate-950/35 backdrop-blur-xl"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.16),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.12),transparent_32%)] opacity-80" />
      <div className="relative z-10">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase text-slate-400">{agent.role}</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{agent.name}</h2>
          </div>
          <StatusBadge kind="agent" status={agent.status} />
        </div>

        <div className="grid gap-4 md:grid-cols-[132px_1fr]">
          <CreatureAvatar avatarType={agent.avatarType} status={agent.status} compact />
          <div className="flex min-w-0 flex-col justify-center">
            <p className="line-clamp-3 text-sm leading-6 text-slate-300">{agent.description}</p>
            <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/28 p-3">
              <p className="text-xs text-slate-500">Task corrente</p>
              <p className="mt-1 truncate text-sm font-medium text-slate-100">
                {agent.currentTask?.title ?? "Nessun task attivo"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Metric icon={CheckCircle2} label="Done" value={metrics.completedTasks} tone="emerald" />
          <Metric icon={XCircle} label="Fail" value={metrics.failedTasks} tone="rose" />
          <Metric icon={FileText} label="Draft" value={metrics.draftsCreated} tone="cyan" />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Ultima attivita: {formatDate(agent.lastActivity)}</p>
          <button
            type="button"
            onClick={() => onOpen(agent)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-medium text-white transition hover:bg-white/16"
          >
            Apri
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  tone: "emerald" | "rose" | "cyan";
}) {
  const colors = {
    emerald: "text-emerald-200 bg-emerald-300/10",
    rose: "text-rose-200 bg-rose-300/10",
    cyan: "text-cyan-200 bg-cyan-300/10"
  };

  return (
    <div className={`rounded-xl border border-white/10 p-3 ${colors[tone]}`}>
      <Icon size={16} />
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
