import clsx from "clsx";
import type { AgentStatus, DraftStatus, RiskLevel, TaskStatus } from "../types/domain";
import { agentStatusLabel, draftStatusLabel, riskLabel, taskStatusLabel } from "../utils/status";

type Props =
  | { kind: "agent"; status: AgentStatus }
  | { kind: "task"; status: TaskStatus }
  | { kind: "draft"; status: DraftStatus }
  | { kind: "risk"; status: RiskLevel };

const palette: Record<string, string> = {
  idle: "border-slate-500/40 bg-slate-400/10 text-slate-200",
  working: "border-cyan-300/50 bg-cyan-300/12 text-cyan-100",
  waiting_approval: "border-amber-300/50 bg-amber-300/12 text-amber-100",
  error: "border-rose-300/50 bg-rose-400/12 text-rose-100",
  pending: "border-slate-500/40 bg-slate-400/10 text-slate-200",
  running: "border-cyan-300/50 bg-cyan-300/12 text-cyan-100",
  completed: "border-emerald-300/50 bg-emerald-300/12 text-emerald-100",
  rejected: "border-rose-300/50 bg-rose-400/12 text-rose-100",
  failed: "border-rose-300/50 bg-rose-400/12 text-rose-100",
  draft: "border-violet-300/50 bg-violet-300/12 text-violet-100",
  approved: "border-emerald-300/50 bg-emerald-300/12 text-emerald-100",
  revision_requested: "border-orange-300/50 bg-orange-300/12 text-orange-100",
  low: "border-emerald-300/50 bg-emerald-300/12 text-emerald-100",
  medium: "border-amber-300/50 bg-amber-300/12 text-amber-100",
  high: "border-rose-300/50 bg-rose-400/12 text-rose-100"
};

export function StatusBadge(props: Props) {
  const label =
    props.kind === "agent"
      ? agentStatusLabel[props.status]
      : props.kind === "task"
        ? taskStatusLabel[props.status]
        : props.kind === "draft"
          ? draftStatusLabel[props.status]
          : riskLabel[props.status];

  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold",
        palette[props.status]
      )}
    >
      {label}
    </span>
  );
}
