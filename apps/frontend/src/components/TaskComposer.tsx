import { useState } from "react";
import { Play, Send } from "lucide-react";
import { getGeneralErrorMessage } from "../api/error";
import type { Agent, Platform, Task, TaskPriority } from "../types/domain";
import { FieldError } from "./forms/FieldError";
import { FormError } from "./forms/FormError";
import { LoadingButton } from "./forms/LoadingButton";
import { useToast } from "./toast/ToastProvider";

type Props = {
  agent: Agent;
  onCreate: (body: {
    title: string;
    prompt: string;
    runNow: boolean;
    platform?: Platform;
    priority?: TaskPriority;
    scheduledAt?: string | null;
  }) => Promise<Task | void>;
};

const promptExamples = [
  "Genera 3 idee post Instagram per promuovere i miei servizi da freelance full-stack",
  "Scrivi un post LinkedIn sul valore di Docker nei progetti freelance"
];

export function TaskComposer({ agent, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState(promptExamples[0] ?? "");
  const [platform, setPlatform] = useState<Platform>(
    agent.slug === "instaspark" ? "instagram" : agent.slug === "linkforge" ? "linkedin" : "internal"
  );
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string | undefined; prompt?: string | undefined }>({});
  const toast = useToast();

  async function submit(runNow: boolean) {
    const nextErrors = {
      title: title.length > 160 ? "Massimo 160 caratteri." : undefined,
      prompt:
        prompt.trim().length < 5
          ? "Minimo 5 caratteri."
          : prompt.length > 5000
            ? "Massimo 5000 caratteri."
            : undefined
    };

    setFieldErrors(nextErrors);

    if (nextErrors.title || nextErrors.prompt) {
      setFormError("Controlla i campi evidenziati.");
      toast.warning("Task non creato", "Titolo o prompt non validi.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await onCreate({
        title: title.trim() || `Task per ${agent.name}`,
        prompt,
        runNow,
        platform,
        priority,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null
      });
      setTitle("");
      toast.success(runNow ? "Task assegnato e avviato" : "Task assegnato");
    } catch (err) {
      const message = getGeneralErrorMessage(err);
      setFormError(message);
      toast.error("Errore assegnazione task", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
      <div className="mb-4">
        <p className="text-sm font-semibold text-white">Assegna task</p>
        <p className="text-xs text-slate-500">{agent.name} ricevera una richiesta manuale.</p>
      </div>
      <div className="grid gap-3">
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setFieldErrors((current) => ({ ...current, title: undefined }));
          }}
          placeholder="Titolo task"
          aria-invalid={Boolean(fieldErrors.title)}
          className={`h-11 rounded-xl border bg-slate-950/50 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/45 ${
            fieldErrors.title ? "border-rose-300/50" : "border-white/10"
          }`}
        />
        <FieldError message={fieldErrors.title} />
        <textarea
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            setFieldErrors((current) => ({ ...current, prompt: undefined }));
          }}
          rows={5}
          aria-invalid={Boolean(fieldErrors.prompt)}
          className={`resize-none rounded-xl border bg-slate-950/50 p-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/45 ${
            fieldErrors.prompt ? "border-rose-300/50" : "border-white/10"
          }`}
        />
        <div className="flex items-center justify-between gap-3">
          <FieldError message={fieldErrors.prompt} />
          <span className={prompt.length > 5000 ? "text-xs text-rose-200" : "text-xs text-slate-600"}>
            {prompt.length}/5000
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-xs text-slate-500">
            Platform
            <select
              value={platform}
              onChange={(event) => setPlatform(event.target.value as Platform)}
              className="h-10 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
            >
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="internal">Internal</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs text-slate-500">
            Priority
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as TaskPriority)}
              className="h-10 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs text-slate-500">
            Scheduled
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="h-10 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
            />
          </label>
        </div>
      </div>
      <div className="mt-3">
        <FormError message={formError} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {promptExamples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setPrompt(example)}
            className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/12"
          >
            {example}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <LoadingButton
          type="button"
          loading={submitting}
          disabled={prompt.trim().length < 5}
          loadingLabel="Salvataggio..."
          onClick={() => void submit(false)}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Send size={16} />
          Salva
        </LoadingButton>
        <LoadingButton
          type="button"
          loading={submitting}
          disabled={prompt.trim().length < 5}
          loadingLabel="Avvio..."
          onClick={() => void submit(true)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Play size={16} />
          Salva e avvia
        </LoadingButton>
      </div>
    </div>
  );
}
