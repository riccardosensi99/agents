import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { api } from "./api/client";
import { Sidebar, type ViewKey } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { AgentDetailPage } from "./pages/AgentDetailPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DraftsPage } from "./pages/DraftsPage";
import { LoginPage } from "./pages/LoginPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TasksPage } from "./pages/TasksPage";
import type { Agent, Draft, SystemStatus, Task, User } from "./types/domain";

const AgentRoomPage = lazy(() =>
  import("./pages/AgentRoomPage").then((module) => ({ default: module.AgentRoomPage }))
);

type AuthState = {
  token: string;
  user: User;
};

const storedAuth = () => {
  const raw = localStorage.getItem("agent-dock-auth");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
};

const pathForView: Record<ViewKey, string> = {
  dashboard: "/",
  "agent-room": "/agent-room",
  agents: "/agents",
  tasks: "/tasks",
  drafts: "/drafts",
  approvals: "/approvals",
  settings: "/settings"
};

const viewFromPath = (path: string): ViewKey => {
  if (path === "/agent-room") {
    return "agent-room";
  }
  if (path === "/agents") {
    return "agents";
  }
  if (path === "/tasks") {
    return "tasks";
  }
  if (path === "/drafts") {
    return "drafts";
  }
  if (path === "/approvals") {
    return "approvals";
  }
  if (path === "/settings") {
    return "settings";
  }
  return "dashboard";
};

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => storedAuth());
  const [activeView, setActiveView] = useState<ViewKey>(() => viewFromPath(window.location.pathname));
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const token = auth?.token;

  const loadAll = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [nextAgents, nextTasks, nextDrafts, nextSystem] = await Promise.all([
        api.getAgents(token),
        api.getTasks(token),
        api.getDrafts(token),
        api.getSystemStatus(token)
      ]);
      setAgents(nextAgents);
      setTasks(nextTasks);
      setDrafts(nextDrafts);
      setSystemStatus(nextSystem);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore caricamento dati");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadSelectedAgent = useCallback(async () => {
    if (!token || !selectedAgentId) {
      setSelectedAgent(null);
      return;
    }

    const agent = await api.getAgent(token, selectedAgentId);
    setSelectedAgent(agent);
  }, [selectedAgentId, token]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      void loadAll();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadAll, token]);

  useEffect(() => {
    void loadSelectedAgent();
  }, [loadSelectedAgent]);

  useEffect(() => {
    const onPopState = () => {
      setActiveView(viewFromPath(window.location.pathname));
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const changeView = useCallback((view: ViewKey) => {
    setActiveView(view);
    if (view !== "agents") {
      setSelectedAgentId(null);
    }

    const nextPath = pathForView[view];
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
  }, []);

  const openAgent = useCallback((agent: Agent) => {
    setSelectedAgentId(agent.id);
    setActiveView("agents");
    if (window.location.pathname !== "/agents") {
      window.history.pushState(null, "", "/agents");
    }
  }, []);

  const handlers = useMemo(
    () => ({
      async createTask(agentId: string, body: { title: string; prompt: string; runNow: boolean }) {
        if (!token) {
          return;
        }
        const task = await api.createTask(token, agentId, { title: body.title, prompt: body.prompt });
        if (body.runNow) {
          await api.runTask(token, task.id);
        }
        await loadAll();
        await loadSelectedAgent();
        return task;
      },
      async runTask(taskId: string) {
        if (!token) {
          return;
        }
        await api.runTask(token, taskId);
        await loadAll();
        await loadSelectedAgent();
      },
      async saveDraft(draftId: string, body: { title?: string; content?: string }) {
        if (!token) {
          return;
        }
        await api.patchDraft(token, draftId, body);
        await loadAll();
        await loadSelectedAgent();
      },
      async approveDraft(draftId: string) {
        if (!token) {
          return;
        }
        await api.approveDraft(token, draftId);
        await loadAll();
        await loadSelectedAgent();
      },
      async rejectDraft(draftId: string) {
        if (!token) {
          return;
        }
        await api.rejectDraft(token, draftId, "Rifiutata dalla dashboard");
        await loadAll();
        await loadSelectedAgent();
      },
      async revisionDraft(draftId: string) {
        if (!token) {
          return;
        }
        await api.requestRevision(token, draftId, "Richiesta revisione manuale");
        await loadAll();
        await loadSelectedAgent();
      },
      async pauseAgent(agentId: string) {
        if (!token) {
          return;
        }
        await api.updateAgent(token, agentId, { status: "idle" });
        await loadAll();
        await loadSelectedAgent();
      },
      async updateAgent(agentId: string, body: Partial<Agent>) {
        if (!token) {
          return;
        }
        await api.updateAgent(token, agentId, body);
        await loadAll();
        await loadSelectedAgent();
      }
    }),
    [loadAll, loadSelectedAgent, token]
  );

  if (!auth) {
    return (
      <LoginPage
        onLogin={(nextToken, user) => {
          const nextAuth = { token: nextToken, user };
          localStorage.setItem("agent-dock-auth", JSON.stringify(nextAuth));
          setAuth(nextAuth);
        }}
      />
    );
  }

  const renderContent = () => {
    if (activeView === "agents" && selectedAgent) {
      return (
        <AgentDetailPage
          agent={selectedAgent}
          onBack={() => {
            setSelectedAgentId(null);
            changeView("dashboard");
          }}
          onPause={handlers.pauseAgent}
          onUpdate={handlers.updateAgent}
          onCreateTask={(body) => handlers.createTask(selectedAgent.id, body)}
        />
      );
    }

    if (activeView === "agent-room") {
      return (
        <Suspense
          fallback={
            <div className="grid min-h-[calc(100vh-82px)] place-items-center text-sm text-slate-400">
              Caricamento Agent Room...
            </div>
          }
        >
          <AgentRoomPage
            agents={agents}
            tasks={tasks}
            drafts={drafts}
            status={systemStatus}
            onRefresh={loadAll}
            onOpenAgent={openAgent}
            onPauseAgent={handlers.pauseAgent}
            onCreateTask={handlers.createTask}
          />
        </Suspense>
      );
    }

    if (activeView === "tasks") {
      return <TasksPage tasks={tasks} onRunTask={handlers.runTask} />;
    }

    if (activeView === "drafts") {
      return (
        <DraftsPage
          title="Drafts"
          drafts={drafts}
          onSaveDraft={handlers.saveDraft}
          onApproveDraft={handlers.approveDraft}
          onRejectDraft={handlers.rejectDraft}
          onRevisionDraft={handlers.revisionDraft}
        />
      );
    }

    if (activeView === "approvals") {
      return (
        <DraftsPage
          title="Approvals"
          drafts={drafts}
          onlyApprovals
          onSaveDraft={handlers.saveDraft}
          onApproveDraft={handlers.approveDraft}
          onRejectDraft={handlers.rejectDraft}
          onRevisionDraft={handlers.revisionDraft}
        />
      );
    }

    if (activeView === "settings") {
      return <SettingsPage status={systemStatus} />;
    }

    return (
      <DashboardPage
        agents={agents}
        drafts={drafts}
        status={systemStatus}
        onOpenAgent={openAgent}
        onSaveDraft={handlers.saveDraft}
        onApproveDraft={handlers.approveDraft}
        onRejectDraft={handlers.rejectDraft}
        onRevisionDraft={handlers.revisionDraft}
      />
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_22%_8%,rgba(45,212,191,0.18),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(251,146,60,0.12),transparent_28%),linear-gradient(145deg,#020617,#0f172a_52%,#111827)]" />
      <Sidebar
        activeView={activeView}
        onChangeView={changeView}
        onLogout={() => {
          localStorage.removeItem("agent-dock-auth");
          setAuth(null);
        }}
      />
      <div className="relative z-10 lg:pl-72">
        <Topbar status={systemStatus} userName={auth.user.name} />
        <div className="flex items-center gap-2 border-b border-white/10 bg-slate-950/50 px-4 py-3 lg:hidden">
          <Menu size={18} />
          <select
            value={activeView}
            onChange={(event) => changeView(event.target.value as ViewKey)}
            className="h-10 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white"
          >
            <option value="dashboard">Dashboard</option>
            <option value="agent-room">Agent Room</option>
            <option value="agents">Agents</option>
            <option value="tasks">Tasks</option>
            <option value="drafts">Drafts</option>
            <option value="approvals">Approvals</option>
            <option value="settings">Settings</option>
          </select>
        </div>
        <main className={activeView === "agent-room" ? "p-0" : "px-4 py-6 lg:px-8"}>
          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-300/25 bg-rose-300/10 p-4 text-sm text-rose-100">
              {error}
            </div>
          ) : null}
          {loading ? <div className="mb-4 text-sm text-slate-500">Sincronizzazione dati...</div> : null}
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
