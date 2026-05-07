import { Play } from "lucide-react";
import type { Task } from "../types/domain";
import { formatDate } from "../utils/format";
import { StatusBadge } from "../components/StatusBadge";

type Props = {
  tasks: Task[];
  onRunTask: (taskId: string) => Promise<void>;
};

export function TasksPage({ tasks, onRunTask }: Props) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">Tasks</h2>
        <p className="mt-1 text-sm text-slate-500">Esecuzione manuale, risultato e stato operativo.</p>
      </div>
      <div className="grid gap-3">
        {tasks.map((task) => (
          <article key={task.id} className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-base font-semibold text-white">{task.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {task.agent?.name ?? "Agent"} / {formatDate(task.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge kind="task" status={task.status} />
                {["pending", "failed", "rejected"].includes(task.status) ? (
                  <button
                    type="button"
                    onClick={() => void onRunTask(task.id)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-cyan-300 px-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
                  >
                    <Play size={15} />
                    Run
                  </button>
                ) : null}
              </div>
            </div>
            <p className="mt-4 whitespace-pre-line rounded-xl border border-white/10 bg-slate-950/35 p-3 text-sm leading-6 text-slate-300">
              {task.prompt}
            </p>
            {task.error ? <p className="mt-3 text-sm text-rose-200">{task.error}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
