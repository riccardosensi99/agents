import { motion } from "framer-motion";
import { AgentCard } from "../components/AgentCard";
import { DraftCard } from "../components/DraftCard";
import type { Agent, Draft, SystemStatus } from "../types/domain";

type Props = {
  agents: Agent[];
  drafts: Draft[];
  status?: SystemStatus | null;
  onOpenAgent: (agent: Agent) => void;
  onSaveDraft: (draftId: string, body: { title?: string; content?: string }) => Promise<void>;
  onApproveDraft: (draftId: string) => Promise<void>;
  onRejectDraft: (draftId: string) => Promise<void>;
  onRevisionDraft: (draftId: string) => Promise<void>;
  onRegenerateDraft: (draftId: string) => Promise<void>;
};

export function DashboardPage({
  agents,
  drafts,
  status,
  onOpenAgent,
  onSaveDraft,
  onApproveDraft,
  onRejectDraft,
  onRevisionDraft,
  onRegenerateDraft
}: Props) {
  const approvals = drafts.filter((draft) => draft.status === "waiting_approval").slice(0, 3);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Agenti" value={status?.counts.agents ?? agents.length} tone="cyan" />
        <Kpi label="Task pending" value={status?.counts.pendingTasks ?? 0} tone="amber" />
        <Kpi label="Task running" value={status?.counts.runningTasks ?? 0} tone="emerald" />
        <Kpi label="Da approvare" value={status?.counts.approvalDrafts ?? approvals.length} tone="rose" />
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Companion agents</h2>
            <p className="mt-1 text-sm text-slate-500">Stato operativo, task e bozze in tempo reale.</p>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onOpen={onOpenAgent} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">Da approvare</h2>
          <p className="mt-1 text-sm text-slate-500">Ogni bozza social passa dal Supervisor prima della tua decisione.</p>
        </div>
        <div className="grid gap-4">
          {approvals.length > 0 ? (
            approvals.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                onSave={onSaveDraft}
                onApprove={onApproveDraft}
                onReject={onRejectDraft}
                onRevision={onRevisionDraft}
                onRegenerate={onRegenerateDraft}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/10 bg-white/8 p-6 text-sm text-slate-400 backdrop-blur-xl"
            >
              Nessuna bozza in attesa.
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: "cyan" | "amber" | "emerald" | "rose" }) {
  const tones = {
    cyan: "from-cyan-300/18 to-slate-500/8",
    amber: "from-amber-300/18 to-slate-500/8",
    emerald: "from-emerald-300/18 to-slate-500/8",
    rose: "from-rose-300/18 to-slate-500/8"
  };

  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${tones[tone]} p-4 backdrop-blur-xl`}>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
