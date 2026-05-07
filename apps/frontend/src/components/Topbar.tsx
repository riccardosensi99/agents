import { Activity, Cpu, Database, ShieldCheck } from "lucide-react";
import type { SystemStatus } from "../types/domain";

type Props = {
  status?: SystemStatus | null;
  userName?: string;
};

export function Topbar({ status, userName }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/55 px-4 py-4 backdrop-blur-xl lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs uppercase text-cyan-200/70">AI agent operations</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Dashboard agenti</h1>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-end">
          <StatusPill icon={Database} label="DB" value={status?.database ?? "sync"} tone="emerald" />
          <StatusPill icon={Cpu} label="AI" value={status?.aiProvider ?? "mock"} tone="cyan" />
          <StatusPill icon={ShieldCheck} label="Social" value="off" tone="amber" />
          <StatusPill icon={Activity} label="User" value={userName ?? "owner"} tone="slate" />
        </div>
      </div>
    </header>
  );
}

function StatusPill({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: typeof Database;
  label: string;
  value: string;
  tone: "emerald" | "cyan" | "amber" | "slate";
}) {
  const tones = {
    emerald: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
    amber: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    slate: "border-slate-300/20 bg-slate-300/8 text-slate-100"
  };

  return (
    <div className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-xs ${tones[tone]}`}>
      <Icon size={15} />
      <span className="text-slate-300">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
