import { useState } from "react";
import { Check, Edit3, RotateCcw, Save, X } from "lucide-react";
import { getGeneralErrorMessage } from "../api/error";
import type { Draft } from "../types/domain";
import { formatDate } from "../utils/format";
import { FieldError } from "./forms/FieldError";
import { FormError } from "./forms/FormError";
import { LoadingButton } from "./forms/LoadingButton";
import { StatusBadge } from "./StatusBadge";
import { useToast } from "./toast/ToastProvider";

type Props = {
  draft: Draft;
  onSave: (draftId: string, body: { title?: string; content?: string }) => Promise<void>;
  onApprove: (draftId: string) => Promise<void>;
  onReject: (draftId: string, comment?: string) => Promise<void>;
  onRevision: (draftId: string, comment?: string) => Promise<void>;
  onRegenerate: (draftId: string, comment?: string) => Promise<void>;
};

export function DraftCard({ draft, onSave, onApprove, onReject, onRevision, onRegenerate }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(draft.title);
  const [content, setContent] = useState(draft.content);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string | undefined; content?: string | undefined }>({});
  const toast = useToast();

  async function act(action: () => Promise<void>, successMessage: string, errorTitle: string) {
    setBusy(true);
    setFormError(null);
    try {
      await action();
      setEditing(false);
      toast.success(successMessage);
    } catch (err) {
      const message = getGeneralErrorMessage(err);
      setFormError(message);
      toast.error(errorTitle, message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const nextErrors = {
      title:
        title.trim().length < 2
          ? "Minimo 2 caratteri."
          : title.length > 180
            ? "Massimo 180 caratteri."
            : undefined,
      content:
        content.trim().length < 1
          ? "Il contenuto non puo essere vuoto."
          : content.length > 12000
            ? "Massimo 12000 caratteri."
            : undefined
    };

    setFieldErrors(nextErrors);

    if (nextErrors.title || nextErrors.content) {
      setFormError("Controlla i campi evidenziati.");
      toast.warning("Bozza non salvata", "Correggi titolo o contenuto.");
      return;
    }

    await act(() => onSave(draft.id, { title, content }), "Bozza salvata", "Errore salvataggio bozza");
  }

  const askFeedback = (fallback: string) => window.prompt("Feedback per l'agente", fallback) ?? undefined;

  return (
    <article className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          {editing ? (
            <div className="grid gap-1">
              <input
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setFieldErrors((current) => ({ ...current, title: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.title)}
                className={`h-10 w-full rounded-xl border bg-slate-950/50 px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/45 ${
                  fieldErrors.title ? "border-rose-300/50" : "border-white/10"
                }`}
              />
              <div className="flex items-center justify-between gap-3">
                <FieldError message={fieldErrors.title} />
                <span className={title.length > 180 ? "text-xs text-rose-200" : "text-xs text-slate-600"}>
                  {title.length}/180
                </span>
              </div>
            </div>
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
          <div className="grid gap-1">
            <textarea
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                setFieldErrors((current) => ({ ...current, content: undefined }));
              }}
              rows={8}
              aria-invalid={Boolean(fieldErrors.content)}
              className={`w-full resize-none rounded-xl border bg-slate-950/50 p-3 text-sm leading-6 text-slate-100 outline-none focus:border-cyan-300/45 ${
                fieldErrors.content ? "border-rose-300/50" : "border-white/10"
              }`}
            />
            <div className="flex items-center justify-between gap-3">
              <FieldError message={fieldErrors.content} />
              <span className={content.length > 12000 ? "text-xs text-rose-200" : "text-xs text-slate-600"}>
                {content.length}/12000
              </span>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-line rounded-xl border border-white/10 bg-slate-950/35 p-3 text-sm leading-6 text-slate-200">
            {draft.content}
          </p>
        )}
      </div>

      <div className="mt-4">
        <FormError message={formError} />
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
        {draft.platform === "linkedin" && draft.status === "approved" ? (
          <button
            type="button"
            disabled
            title="LinkedIn publishing is prepared but not enabled. No automatic publishing is available."
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-slate-500 opacity-60"
          >
            Publish LinkedIn
          </button>
        ) : null}
        {editing ? (
          <LoadingButton
            type="button"
            loading={busy}
            loadingLabel="Salvataggio..."
            onClick={() => void save()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-45"
          >
            <Save size={16} />
            Salva
          </LoadingButton>
        ) : null}
        <LoadingButton
          type="button"
          loading={busy}
          onClick={() =>
            void act(
              () =>
                onRegenerate(
                  draft.id,
                  askFeedback("Rigenera mantenendo il Brand Profile e rendendo il testo piu concreto")
                ),
              "Bozza rigenerata",
              "Errore rigenerazione bozza"
            )
          }
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-slate-200 transition hover:bg-white/10 disabled:opacity-45"
        >
          <RotateCcw size={16} />
          Rigenera
        </LoadingButton>
        <LoadingButton
          type="button"
          loading={busy}
          onClick={() =>
            void act(
              () =>
                onRevision(
                  draft.id,
                  askFeedback("Rivedi la bozza: piu specifica, meno generica, piu aderente al mio tono")
                ),
              "Revisione richiesta",
              "Errore richiesta revisione"
            )
          }
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-300/12 px-3 text-sm font-medium text-amber-100 transition hover:bg-amber-300/18 disabled:opacity-45"
        >
          <RotateCcw size={16} />
          Revisione
        </LoadingButton>
        <LoadingButton
          type="button"
          loading={busy}
          onClick={() =>
            void act(
              () => onReject(draft.id, askFeedback("Rifiutata: non abbastanza concreta o non in linea col brand")),
              "Bozza rifiutata",
              "Errore rifiuto bozza"
            )
          }
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-300/12 px-3 text-sm font-medium text-rose-100 transition hover:bg-rose-300/18 disabled:opacity-45"
        >
          <X size={16} />
          Rifiuta
        </LoadingButton>
        <LoadingButton
          type="button"
          loading={busy}
          onClick={() => void act(() => onApprove(draft.id), "Bozza approvata", "Errore approvazione bozza")}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-300 px-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-45"
        >
          <Check size={16} />
          Approva
        </LoadingButton>
      </div>
    </article>
  );
}
