import { ArrowLeft, Edit3, Pause, Save } from "lucide-react";
import { useState } from "react";
import { CreatureAvatar } from "../components/CreatureAvatar";
import { StatusBadge } from "../components/StatusBadge";
import { TaskComposer } from "../components/TaskComposer";
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
                    onChange={(event) => setRole(event.target.value)}
                    className="h-11 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
                  />
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    className="resize-none rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/45"
                  />
                </>
              ) : (
                <>
                  <p className="text-lg font-medium text-slate-100">{agent.role}</p>
                  <p className="max-w-3xl text-sm leading-6 text-slate-300">{agent.description}</p>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onPause(agent.id)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-slate-200 transition hover:bg-white/10"
              >
                <Pause size={16} />
                Pausa agente
              </button>
              <button
                type="button"
                onClick={() => setEditing((value) => !value)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-slate-200 transition hover:bg-white/10"
              >
                <Edit3 size={16} />
                Modifica agente
              </button>
              {editing ? (
                <button
                  type="button"
                  onClick={() => {
                    void onUpdate(agent.id, { role, description });
                    setEditing(false);
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                >
                  <Save size={16} />
                  Salva modifiche
                </button>
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
