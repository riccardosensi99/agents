import { DraftCard } from "../components/DraftCard";
import type { Draft } from "../types/domain";
import { useState } from "react";

type Props = {
  title: string;
  drafts: Draft[];
  onlyApprovals?: boolean;
  onSaveDraft: (draftId: string, body: { title?: string; content?: string }) => Promise<void>;
  onApproveDraft: (draftId: string) => Promise<void>;
  onRejectDraft: (draftId: string, comment?: string) => Promise<void>;
  onRevisionDraft: (draftId: string, comment?: string) => Promise<void>;
  onRegenerateDraft: (draftId: string, comment?: string) => Promise<void>;
};

export function DraftsPage({
  title,
  drafts,
  onlyApprovals = false,
  onSaveDraft,
  onApproveDraft,
  onRejectDraft,
  onRevisionDraft,
  onRegenerateDraft
}: Props) {
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState(onlyApprovals ? "waiting_approval" : "all");
  const visible = drafts.filter((draft) => {
    const approvalMatches = !onlyApprovals || draft.status === "waiting_approval";
    const platformMatches = platformFilter === "all" || draft.platform === platformFilter;
    const statusMatches = statusFilter === "all" || draft.status === statusFilter;
    return approvalMatches && platformMatches && statusMatches;
  });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">Revisione manuale con feedback Supervisor e stato approvazione.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          value={platformFilter}
          onChange={(event) => setPlatformFilter(event.target.value)}
          className="h-10 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none"
        >
          <option value="all">Tutte le piattaforme</option>
          <option value="instagram">Instagram</option>
          <option value="linkedin">LinkedIn</option>
          <option value="internal">Internal</option>
        </select>
        {!onlyApprovals ? (
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none"
          >
            <option value="all">Tutti gli stati</option>
            <option value="waiting_approval">Da approvare</option>
            <option value="approved">Approvate</option>
            <option value="rejected">Rifiutate</option>
            <option value="revision_requested">Revisioni</option>
          </select>
        ) : null}
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
            onRegenerate={onRegenerateDraft}
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
