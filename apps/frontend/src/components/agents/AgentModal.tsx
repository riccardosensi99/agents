import { X } from "lucide-react";
import type { Agent } from "../../types/domain";
import { AgentForm, type AgentFormValues } from "./AgentForm";

type Props = {
  title: string;
  description: string;
  submitLabel: string;
  agent?: Agent | null | undefined;
  loading?: boolean | undefined;
  error?: string | null | undefined;
  onClose: () => void;
  onSubmit: (values: AgentFormValues) => Promise<void>;
};

export function AgentModal({ title, description, submitLabel, agent, loading, error, onClose, onSubmit }: Props) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/72 px-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/96 p-5 shadow-2xl shadow-slate-950">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-cyan-200/70">Agent management</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
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

        <AgentForm agent={agent} submitLabel={submitLabel} loading={loading} error={error} onSubmit={onSubmit} />
      </div>
    </div>
  );
}
