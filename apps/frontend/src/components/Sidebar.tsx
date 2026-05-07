import clsx from "clsx";
import { BadgeCheck, Bot, Files, Gamepad2, LayoutDashboard, ListChecks, LogOut, Settings } from "lucide-react";

export type ViewKey = "dashboard" | "agent-room" | "agents" | "tasks" | "drafts" | "approvals" | "settings";

type Props = {
  activeView: ViewKey;
  onChangeView: (view: ViewKey) => void;
  onLogout: () => void;
};

const items: Array<{ key: ViewKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "agent-room", label: "Agent Room", icon: Gamepad2 },
  { key: "agents", label: "Agents", icon: Bot },
  { key: "tasks", label: "Tasks", icon: ListChecks },
  { key: "drafts", label: "Drafts", icon: Files },
  { key: "approvals", label: "Approvals", icon: BadgeCheck },
  { key: "settings", label: "Settings", icon: Settings }
];

export function Sidebar({ activeView, onChangeView, onLogout }: Props) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/10 bg-slate-950/72 px-4 py-5 backdrop-blur-xl lg:flex lg:flex-col">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/35 bg-cyan-300/10 text-cyan-100 shadow-glow">
          <Bot size={22} />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Agent Dock</p>
          <p className="text-xs text-slate-400">Freelance control room</p>
        </div>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = activeView === item.key;
          return (
            <button
              key={item.key}
              type="button"
              title={item.label}
              onClick={() => onChangeView(item.key)}
              className={clsx(
                "flex h-11 w-full items-center gap-3 rounded-xl border px-3 text-left text-sm transition",
                selected
                  ? "border-cyan-300/40 bg-cyan-300/12 text-white shadow-glow"
                  : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/6 hover:text-slate-100"
              )}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/6 p-3">
        <p className="text-xs font-medium text-slate-300">Social publishing</p>
        <p className="mt-1 text-xs text-slate-500">Disabilitato nel MVP</p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white/8 text-sm text-slate-200 transition hover:bg-white/12"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
