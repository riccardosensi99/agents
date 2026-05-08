import { ArrowLeft, Edit3, Pause, Save } from "lucide-react";
import { useState } from "react";
import { getGeneralErrorMessage } from "../api/error";
import { CreatureAvatar } from "../components/CreatureAvatar";
import { FieldError } from "../components/forms/FieldError";
import { FormError } from "../components/forms/FormError";
import { LoadingButton } from "../components/forms/LoadingButton";
import { StatusBadge } from "../components/StatusBadge";
import { TaskComposer } from "../components/TaskComposer";
import { useToast } from "../components/toast/ToastProvider";
import type { Agent, Platform, Task, TaskPriority } from "../types/domain";
import { formatDate } from "../utils/format";

type Props = {
  agent: Agent;
  onBack: () => void;
  onPause: (agentId: string) => Promise<void>;
  onUpdate: (agentId: string, body: Partial<Agent>) => Promise<void>;
  onCreateTask: (body: {
    title: string;
    prompt: string;
    runNow: boolean;
    platform?: Platform;
    priority?: TaskPriority;
    scheduledAt?: string | null;
  }) => Promise<Task | void>;
};

export function AgentDetailPage({ agent, onBack, onPause, onUpdate, onCreateTask }: Props) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(agent.role);
  const [description, setDescription] = useState(agent.description);
  const [saving, setSaving] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ role?: string | undefined; description?: string | undefined }>({});
  const toast = useToast();

  async function pause() {
    setPausing(true);
    try {
      await onPause(agent.id);
      toast.success("Agente messo in pausa");
    } catch (err) {
      toast.error("Errore pausa agente", getGeneralErrorMessage(err));
    } finally {
      setPausing(false);
    }
  }

  async function saveAgent() {
    const nextErrors = {
      role:
        role.trim().length < 2
          ? "Minimo 2 caratteri."
          : role.length > 120
            ? "Massimo 120 caratteri."
            : undefined,
      description:
        description.trim().length < 2
          ? "Minimo 2 caratteri."
          : description.length > 1000
            ? "Massimo 1000 caratteri."
            : undefined
    };

    setFieldErrors(nextErrors);

    if (nextErrors.role || nextErrors.description) {
      setFormError("Controlla i campi evidenziati.");
      toast.warning("Agente non salvato", "Ruolo o descrizione non validi.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await onUpdate(agent.id, { role, description });
      setEditing(false);
      toast.success("Agente aggiornato");
    } catch (err) {
      const message = getGeneralErrorMessage(err);
      setFormError(message);
      toast.error("Errore modifica agente", message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-slate-200 transition hover:bg-white/10"
      >
        <ArrowLeft size={16} />
        Torna
      </button>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur-xl">
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="grid place-items-center rounded-3xl border border-white/10 bg-slate-950/30 p-4">
            <CreatureAvatar avatarType={agent.avatarType} status={agent.status} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase text-cyan-200/70">{agent.slug}</p>
                <h2 className="mt-1 text-3xl font-semibold text-white">{agent.name}</h2>
              </div>
              <StatusBadge kind="agent" status={agent.status} />
            </div>

            <div className="mt-5 grid gap-3">
              {editing ? (
                <>
                  <input
                    value={role}
                    onChange={(event) => {
                      setRole(event.target.value);
                      setFieldErrors((current) => ({ ...current, role: undefined }));
                    }}
                    aria-invalid={Boolean(fieldErrors.role)}
                    className={`h-11 rounded-xl border bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45 ${
                      fieldErrors.role ? "border-rose-300/50" : "border-white/10"
                    }`}
                  />
                  <FieldError message={fieldErrors.role} />
                  <textarea
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value);
                      setFieldErrors((current) => ({ ...current, description: undefined }));
                    }}
                    rows={4}
                    aria-invalid={Boolean(fieldErrors.description)}
                    className={`resize-none rounded-xl border bg-slate-950/50 p-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/45 ${
                      fieldErrors.description ? "border-rose-300/50" : "border-white/10"
                    }`}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <FieldError message={fieldErrors.description} />
                    <span className={description.length > 1000 ? "text-xs text-rose-200" : "text-xs text-slate-600"}>
                      {description.length}/1000
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium text-slate-100">{agent.role}</p>
                  <p className="max-w-3xl text-sm leading-6 text-slate-300">{agent.description}</p>
                </>
              )}
            </div>

            <div className="mt-4">
              <FormError message={formError} />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <LoadingButton
                type="button"
                loading={pausing}
                loadingLabel="Pausa..."
                onClick={() => void pause()}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-slate-200 transition hover:bg-white/10"
              >
                <Pause size={16} />
                Pausa agente
              </LoadingButton>
              <button
                type="button"
                onClick={() => setEditing((value) => !value)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-slate-200 transition hover:bg-white/10"
              >
                <Edit3 size={16} />
                Modifica agente
              </button>
              {editing ? (
                <LoadingButton
                  type="button"
                  loading={saving}
                  loadingLabel="Salvataggio..."
                  onClick={() => void saveAgent()}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                >
                  <Save size={16} />
                  Salva modifiche
                </LoadingButton>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
          <h3 className="text-base font-semibold text-white">Timeline attivita</h3>
          <div className="mt-4 space-y-3">
            {(agent.recentLogs ?? []).map((log) => (
              <div key={log.id} className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-100">{log.message}</p>
                  <span className="text-xs text-slate-500">{formatDate(log.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{log.level}</p>
              </div>
            ))}
            {(agent.recentLogs ?? []).length === 0 ? <p className="text-sm text-slate-500">Nessun log.</p> : null}
          </div>
        </section>

        <TaskComposer agent={agent} onCreate={onCreateTask} />
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Task recenti">
          {(agent.recentTasks ?? []).map((task) => (
            <div key={task.id} className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{task.title}</p>
                <StatusBadge kind="task" status={task.status} />
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{task.prompt}</p>
            </div>
          ))}
        </Panel>
        <Panel title="Bozze generate">
          {(agent.recentDrafts ?? []).map((draft) => (
            <div key={draft.id} className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{draft.title}</p>
                <StatusBadge kind="draft" status={draft.status} />
              </div>
              <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs leading-5 text-slate-500">{draft.content}</p>
            </div>
          ))}
        </Panel>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
      <h3 className="mb-4 text-base font-semibold text-white">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
