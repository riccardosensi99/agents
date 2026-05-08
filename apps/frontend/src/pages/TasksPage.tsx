import { Ban, Play, RotateCcw, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { getGeneralErrorMessage } from "../api/error";
import { FormError } from "../components/forms/FormError";
import { LoadingButton } from "../components/forms/LoadingButton";
import type { Agent, Platform, Task, TaskPriority } from "../types/domain";
import { formatDate } from "../utils/format";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../components/toast/ToastProvider";

type Props = {
  agents: Agent[];
  tasks: Task[];
  onCreateTask: (
    agentId: string,
    body: {
      title: string;
      prompt: string;
      runNow: boolean;
      platform?: Platform;
      priority?: TaskPriority;
      scheduledAt?: string | null;
    }
  ) => Promise<Task | void>;
  onRunTask: (taskId: string) => Promise<void>;
  onRetryTask: (taskId: string) => Promise<void>;
  onCancelTask: (taskId: string) => Promise<void>;
};

export function TasksPage({ agents, tasks, onCreateTask, onRunTask, onRetryTask, onCancelTask }: Props) {
  const defaultAgent = useMemo(
    () => agents.find((agent) => agent.slug === "instaspark") ?? agents[0],
    [agents]
  );
  const [agentId, setAgentId] = useState(defaultAgent?.id ?? "");
  const selectedAgent = agents.find((agent) => agent.id === agentId) ?? defaultAgent;
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("Genera una bozza concreta per promuovere i miei servizi full-stack senza tono cringe.");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [submitting, setSubmitting] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const toast = useToast();

  const visibleTasks = tasks.filter((task) => {
    const statusMatches = statusFilter === "all" || task.status === statusFilter;
    const platformMatches = platformFilter === "all" || task.platform === platformFilter;
    return statusMatches && platformMatches;
  });

  async function create(runNow: boolean) {
    if (!selectedAgent || prompt.trim().length < 5) {
      setFormError("Il prompt deve contenere almeno 5 caratteri.");
      toast.warning("Task non creato", "Aggiungi un prompt piu completo.");
      return;
    }

    if (title.length > 160) {
      setFormError("Il titolo puo contenere al massimo 160 caratteri.");
      toast.warning("Task non creato", "Il titolo e troppo lungo.");
      return;
    }

    if (prompt.length > 5000) {
      setFormError("Il prompt puo contenere al massimo 5000 caratteri.");
      toast.warning("Task non creato", "Il prompt e troppo lungo.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await onCreateTask(selectedAgent.id, {
        title: title.trim() || `Task per ${selectedAgent.name}`,
        prompt,
        runNow,
        platform,
        priority,
        scheduledAt: null
      });
      setTitle("");
      toast.success(runNow ? "Task creato e avviato" : "Task creato correttamente");
    } catch (err) {
      const message = getGeneralErrorMessage(err);
      setFormError(message);
      toast.error("Errore creazione task", message);
    } finally {
      setSubmitting(false);
    }
  }

  async function actOnTask(taskId: string, action: () => Promise<void>, successMessage: string, errorTitle: string) {
    setBusyTaskId(taskId);
    try {
      await action();
      toast.success(successMessage);
    } catch (err) {
      toast.error(errorTitle, getGeneralErrorMessage(err));
    } finally {
      setBusyTaskId(null);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white">Tasks</h2>
        <p className="mt-1 text-sm text-slate-500">Crea, lancia, riprova e monitora i task reali degli agenti.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
        <div className="grid gap-3 lg:grid-cols-[220px_1fr_150px_130px]">
          <select
            value={selectedAgent?.id ?? ""}
            onChange={(event) => setAgentId(event.target.value)}
            className="h-11 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Titolo task"
            className="h-11 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
          />
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value as Platform)}
            className="h-11 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
          >
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
            <option value="internal">Internal</option>
          </select>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
            className="h-11 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={4}
          className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/45"
        />
        <FormError message={formError} />
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <LoadingButton
            type="button"
            loading={submitting}
            disabled={!selectedAgent || prompt.trim().length < 5}
            loadingLabel="Salvataggio..."
            onClick={() => void create(false)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-slate-200 transition hover:bg-white/10 disabled:opacity-45"
          >
            <Send size={16} />
            Salva
          </LoadingButton>
          <LoadingButton
            type="button"
            loading={submitting}
            disabled={!selectedAgent || prompt.trim().length < 5}
            loadingLabel="Avvio..."
            onClick={() => void create(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-45"
          >
            <Play size={16} />
            Salva e avvia
          </LoadingButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-10 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none"
        >
          <option value="all">Tutti gli stati</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="waiting_approval">Da approvare</option>
          <option value="revision_requested">Revisione</option>
          <option value="failed">Falliti</option>
          <option value="completed">Completati</option>
        </select>
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
      </div>

      <div className="grid gap-3">
        {visibleTasks.map((task) => (
          <article key={task.id} className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-base font-semibold text-white">{task.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {task.agent?.name ?? "Agent"} / {task.platform} / {task.priority} / {formatDate(task.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge kind="task" status={task.status} />
                {["pending", "failed", "rejected", "revision_requested"].includes(task.status) ? (
                  <LoadingButton
                    type="button"
                    loading={busyTaskId === task.id}
                    onClick={() =>
                      void actOnTask(task.id, () => onRunTask(task.id), "Task avviato", "Errore avvio task")
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-cyan-300 px-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                  >
                    <Play size={15} />
                    Run
                  </LoadingButton>
                ) : null}
                {task.status === "failed" ? (
                  <LoadingButton
                    type="button"
                    loading={busyTaskId === task.id}
                    onClick={() =>
                      void actOnTask(task.id, () => onRetryTask(task.id), "Task rilanciato", "Errore retry task")
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-slate-200 transition hover:bg-white/10"
                  >
                    <RotateCcw size={15} />
                    Retry
                  </LoadingButton>
                ) : null}
                {task.status !== "running" && task.status !== "completed" ? (
                  <LoadingButton
                    type="button"
                    loading={busyTaskId === task.id}
                    onClick={() =>
                      void actOnTask(task.id, () => onCancelTask(task.id), "Task cancellato", "Errore cancellazione task")
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-rose-300/12 px-3 text-sm text-rose-100 transition hover:bg-rose-300/18"
                  >
                    <Ban size={15} />
                    Cancel
                  </LoadingButton>
                ) : null}
              </div>
            </div>
            <p className="mt-4 whitespace-pre-line rounded-xl border border-white/10 bg-slate-950/35 p-3 text-sm leading-6 text-slate-300">
              {task.prompt}
            </p>
            <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-4">
              <span>Started: {task.startedAt ? formatDate(task.startedAt) : "-"}</span>
              <span>Completed: {task.completedAt ? formatDate(task.completedAt) : "-"}</span>
              <span>Failed: {task.failedAt ? formatDate(task.failedAt) : "-"}</span>
              <span>Retries: {task.retryCount}</span>
            </div>
            {task.errorMessage || task.error ? <p className="mt-3 text-sm text-rose-200">{task.errorMessage ?? task.error}</p> : null}
            {(task.events ?? []).length > 0 ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/25 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Task log</p>
                <div className="mt-2 space-y-1">
                  {(task.events ?? []).slice(0, 4).map((event) => (
                    <p key={event.id} className="text-xs text-slate-400">
                      {formatDate(event.createdAt)} / {event.message}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
