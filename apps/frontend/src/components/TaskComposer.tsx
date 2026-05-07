import { useState } from "react";
import { Play, Send } from "lucide-react";
import type { Agent, Task } from "../types/domain";

type Props = {
  agent: Agent;
  onCreate: (body: { title: string; prompt: string; runNow: boolean }) => Promise<Task | void>;
};

const promptExamples = [
  "Genera 3 idee post Instagram per promuovere i miei servizi da freelance full-stack",
  "Scrivi un post LinkedIn sul valore di Docker nei progetti freelance"
];

export function TaskComposer({ agent, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState(promptExamples[0] ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function submit(runNow: boolean) {
    setSubmitting(true);
    try {
      await onCreate({
        title: title.trim() || `Task per ${agent.name}`,
        prompt,
        runNow
      });
      setTitle("");
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
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Titolo task"
          className="h-11 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/45"
        />
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={5}
          className="resize-none rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/45"
        />
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
        <button
          type="button"
          disabled={submitting || prompt.trim().length < 5}
          onClick={() => void submit(false)}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Send size={16} />
          Salva
        </button>
        <button
          type="button"
          disabled={submitting || prompt.trim().length < 5}
          onClick={() => void submit(true)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Play size={16} />
          Salva e avvia
        </button>
      </div>
    </div>
  );
}
