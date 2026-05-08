import { useState } from "react";
import { Check, Edit3, RotateCcw, Save, X } from "lucide-react";
import type { Draft } from "../types/domain";
import { formatDate } from "../utils/format";
import { StatusBadge } from "./StatusBadge";

type Props = {
  draft: Draft;
  onSave: (draftId: string, body: { title?: string; content?: string }) => Promise<void>;
  onApprove: (draftId: string) => Promise<void>;
  onReject: (draftId: string) => Promise<void>;
  onRevision: (draftId: string) => Promise<void>;
  onRegenerate: (draftId: string) => Promise<void>;
};

export function DraftCard({ draft, onSave, onApprove, onReject, onRevision, onRegenerate }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(draft.title);
  const [content, setContent] = useState(draft.content);
  const [busy, setBusy] = useState(false);

  async function act(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          {editing ? (
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/45"
            />
          ) : (
            <h3 className="text-base font-semibold text-white">{draft.title}</h3>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {draft.agent?.name ?? "Agent"} / {draft.platform} / v{draft.currentVersion} / {formatDate(draft.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge kind="draft" status={draft.status} />
          {draft.riskLevel ? <StatusBadge kind="risk" status={draft.riskLevel} /> : null}
        </div>
      </div>

      <div className="mt-4">
        {editing ? (
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={8}
            className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm leading-6 text-slate-100 outline-none focus:border-cyan-300/45"
          />
        ) : (
          <p className="whitespace-pre-line rounded-xl border border-white/10 bg-slate-950/35 p-3 text-sm leading-6 text-slate-200">
            {draft.content}
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-slate-950/25 p-3 md:grid-cols-[120px_1fr_140px]">
        <div>
          <p className="text-xs text-slate-500">Quality score</p>
          <p className="text-2xl font-semibold text-white">{draft.supervisorScore ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Supervisor feedback</p>
          <p className="mt-1 text-sm leading-5 text-slate-300">
            {draft.supervisorFeedback ?? "Nessun controllo supervisor registrato."}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Action</p>
          <p className="mt-1 text-sm font-semibold text-cyan-100">{draft.recommendedAction ?? "-"}</p>
        </div>
      </div>

      {(draft.versions ?? []).length > 1 ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/25 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Versioni precedenti</p>
          <div className="mt-2 grid gap-2">
            {(draft.versions ?? []).slice(1, 4).map((version) => (
              <details key={version.id} className="rounded-lg border border-white/10 bg-slate-950/30 p-2">
                <summary className="cursor-pointer text-xs text-slate-300">
                  v{version.version} / {version.createdBy} / {formatDate(version.createdAt)}
                </summary>
                <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-400">{version.content}</p>
              </details>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-slate-200 transition hover:bg-white/10"
        >
          <Edit3 size={16} />
          Modifica
        </button>
        {editing ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act(() => onSave(draft.id, { title, content }))}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-45"
          >
            <Save size={16} />
            Salva
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void act(() => onRegenerate(draft.id))}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-slate-200 transition hover:bg-white/10 disabled:opacity-45"
        >
          <RotateCcw size={16} />
          Rigenera
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void act(() => onRevision(draft.id))}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-300/12 px-3 text-sm font-medium text-amber-100 transition hover:bg-amber-300/18 disabled:opacity-45"
        >
          <RotateCcw size={16} />
          Revisione
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void act(() => onReject(draft.id))}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-300/12 px-3 text-sm font-medium text-rose-100 transition hover:bg-rose-300/18 disabled:opacity-45"
        >
          <X size={16} />
          Rifiuta
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void act(() => onApprove(draft.id))}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-300 px-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-45"
        >
          <Check size={16} />
          Approva
        </button>
      </div>
    </article>
  );
}
