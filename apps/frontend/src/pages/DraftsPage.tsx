import { DraftCard } from "../components/DraftCard";
import type { Draft } from "../types/domain";

type Props = {
  title: string;
  drafts: Draft[];
  onlyApprovals?: boolean;
  onSaveDraft: (draftId: string, body: { title?: string; content?: string }) => Promise<void>;
  onApproveDraft: (draftId: string) => Promise<void>;
  onRejectDraft: (draftId: string) => Promise<void>;
  onRevisionDraft: (draftId: string) => Promise<void>;
};

export function DraftsPage({
  title,
  drafts,
  onlyApprovals = false,
  onSaveDraft,
  onApproveDraft,
  onRejectDraft,
  onRevisionDraft
}: Props) {
  const visible = onlyApprovals ? drafts.filter((draft) => draft.status === "waiting_approval") : drafts;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">Revisione manuale con feedback Supervisor e stato approvazione.</p>
      </div>
      <div className="grid gap-4">
        {visible.map((draft) => (
          <DraftCard
            key={draft.id}
            draft={draft}
            onSave={onSaveDraft}
            onApprove={onApproveDraft}
            onReject={onRejectDraft}
            onRevision={onRevisionDraft}
          />
        ))}
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/8 p-6 text-sm text-slate-400 backdrop-blur-xl">
            Nessuna bozza in questa vista.
          </div>
        ) : null}
      </div>
    </section>
  );
}
