import type { SystemStatus } from "../types/domain";

type Props = {
  status?: SystemStatus | null;
};

export function SettingsPage({ status }: Props) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Provider AI, scheduler e vincoli di pubblicazione.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SettingCard label="AI provider" value={status?.aiProvider ?? "mock"} />
        <SettingCard label="Scheduler" value={status?.schedulerEnabled ? "enabled" : "disabled"} />
        <SettingCard label="Social publishing" value={status?.socialPublishing ?? "disabled"} />
        <SettingCard label="API uptime" value={`${status?.uptimeSeconds ?? 0}s`} />
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
        <h3 className="text-base font-semibold text-white">Integration guardrails</h3>
        <div className="mt-4 grid gap-3 text-sm text-slate-300">
          <p className="rounded-xl border border-white/10 bg-slate-950/35 p-3">Le API social non sono collegate nel MVP.</p>
          <p className="rounded-xl border border-white/10 bg-slate-950/35 p-3">Ogni bozza social resta in attesa di approvazione manuale.</p>
          <p className="rounded-xl border border-white/10 bg-slate-950/35 p-3">Lo scheduler puo creare task, ma resta spento finche non viene abilitato via env.</p>
        </div>
      </div>
    </section>
  );
}

function SettingCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
