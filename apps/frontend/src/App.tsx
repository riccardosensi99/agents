import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { api } from "./api/client";
import { getGeneralErrorMessage } from "./api/error";
import { Sidebar, type ViewKey } from "./components/Sidebar";
import { RouteLoadBoundary } from "./components/RouteLoadBoundary";
import { Topbar } from "./components/Topbar";
import { ToastProvider, useToast } from "./components/toast/ToastProvider";
import type { AgentFormValues } from "./components/agents/AgentForm";
import { AgentDetailPage } from "./pages/AgentDetailPage";
import { AgentsPage } from "./pages/AgentsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DraftsPage } from "./pages/DraftsPage";
import { LoginPage } from "./pages/LoginPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TasksPage } from "./pages/TasksPage";
import type { Agent, BrandProfile, Draft, Notification, Platform, SystemStatus, Task, TaskPriority, User } from "./types/domain";

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
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

function AppContent() {
  const [auth, setAuth] = useState<AuthState | null>(() => storedAuth());
  const [activeView, setActiveView] = useState<ViewKey>(() => viewFromPath(window.location.pathname));
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const token = auth?.token;

  const loadAll = useCallback(async (options: { silent?: boolean; notify?: boolean } = {}) => {
    if (!token) {
      return;
    }

    if (!options.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const [nextAgents, nextTasks, nextDrafts, nextSystem, nextNotifications] = await Promise.all([
        api.getAgents(token),
        api.getTasks(token),
        api.getDrafts(token),
        api.getSystemStatus(token),
        api.getNotifications(token)
      ]);
      setAgents(nextAgents);
      setTasks(nextTasks);
      setDrafts(nextDrafts);
      setSystemStatus(nextSystem);
      setNotifications(nextNotifications);
      if (options.notify) {
        toast.success("Dati sincronizzati");
      }
    } catch (err) {
      const message = getGeneralErrorMessage(err);
      setError(message);
      if (options.notify) {
        toast.error("Sincronizzazione non riuscita", message);
      }
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }, [toast, token]);

  const loadSelectedAgent = useCallback(async () => {
    if (!token || !selectedAgentId) {
      setSelectedAgent(null);
      return;
    }

    try {
      const agent = await api.getAgent(token, selectedAgentId);
      setSelectedAgent(agent);
    } catch (err) {
      setError(getGeneralErrorMessage(err));
    }
  }, [selectedAgentId, token]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      void loadAll({ silent: true });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadAll, token]);

  useEffect(() => {
    void loadSelectedAgent();
  }, [loadSelectedAgent]);

  useEffect(() => {
    if (!token) {
      return;
    }

    void Promise.all([api.getBrandProfile(token), api.getNotifications(token)])
      .then(([profile, nextNotifications]) => {
        setBrandProfile(profile);
        setNotifications(nextNotifications);
      })
      .catch((err) => setError(getGeneralErrorMessage(err)));
  }, [token]);

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
      async createTask(
        agentId: string,
        body: {
          title: string;
          prompt: string;
          runNow: boolean;
          platform?: Platform;
          priority?: TaskPriority;
          scheduledAt?: string | null;
        }
      ) {
        if (!token) {
          return;
        }
        const taskBody: {
          title: string;
          prompt: string;
          platform?: Platform;
          priority?: TaskPriority;
          scheduledAt?: string | null;
        } = {
          title: body.title,
          prompt: body.prompt
        };
        if (body.platform) {
          taskBody.platform = body.platform;
        }
        if (body.priority) {
          taskBody.priority = body.priority;
        }
        if (body.scheduledAt !== undefined) {
          taskBody.scheduledAt = body.scheduledAt;
        }
        const task = await api.createTask(token, agentId, taskBody);
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
      async retryTask(taskId: string) {
        if (!token) {
          return;
        }
        await api.retryTask(token, taskId);
        await loadAll();
        await loadSelectedAgent();
      },
      async cancelTask(taskId: string) {
        if (!token) {
          return;
        }
        await api.cancelTask(token, taskId);
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
      async rejectDraft(draftId: string, comment?: string) {
        if (!token) {
          return;
        }
        await api.rejectDraft(token, draftId, comment ?? "Rifiutata dalla dashboard");
        await loadAll();
        await loadSelectedAgent();
      },
      async revisionDraft(draftId: string, comment?: string) {
        if (!token) {
          return;
        }
        await api.requestRevision(token, draftId, comment ?? "Richiesta revisione manuale");
        await loadAll();
        await loadSelectedAgent();
      },
      async regenerateDraft(draftId: string, comment?: string) {
        if (!token) {
          return;
        }
        await api.regenerateDraft(
          token,
          draftId,
          comment ?? "Rigenera mantenendo il brand profile e rendendo il testo piu concreto"
        );
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
      },
      async createAgent(body: AgentFormValues) {
        if (!token) {
          return;
        }
        const agent = await api.createAgent(token, body);
        await loadAll();
        return agent;
      },
      async saveBrandProfile(body: Partial<BrandProfile>) {
        if (!token) {
          return;
        }
        const profile = await api.updateBrandProfile(token, body);
        setBrandProfile(profile);
        await loadAll();
      },
      async markNotificationsRead() {
        if (!token) {
          return;
        }
        const nextNotifications = await api.markAllNotificationsRead(token);
        setNotifications(nextNotifications);
        await loadAll();
      },
      async markNotificationRead(notificationId: string) {
        if (!token) {
          return;
        }
        await api.markNotificationRead(token, notificationId);
        const nextNotifications = await api.getNotifications(token);
        setNotifications(nextNotifications);
        await loadAll();
      },
      async refreshData() {
        await loadAll({ notify: true });
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
            changeView("agents");
          }}
          onPause={handlers.pauseAgent}
          onUpdate={handlers.updateAgent}
          onCreateTask={(body) => handlers.createTask(selectedAgent.id, body)}
        />
      );
    }

    if (activeView === "agents") {
      return (
        <AgentsPage
          agents={agents}
          onOpenAgent={openAgent}
          onCreateAgent={handlers.createAgent}
          onUpdateAgent={handlers.updateAgent}
          onPauseAgent={handlers.pauseAgent}
        />
      );
    }

    if (activeView === "agent-room") {
      return (
        <RouteLoadBoundary
          reloadKey="agent-room-chunk-reloaded"
          fallback={
            <div className="grid min-h-[calc(100vh-82px)] place-items-center text-sm text-slate-400">
              Agent Room non caricata. Aggiorna la pagina per scaricare gli asset piu recenti.
            </div>
          }
        >
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
              onRefresh={handlers.refreshData}
              onOpenAgent={openAgent}
              onPauseAgent={handlers.pauseAgent}
              onCreateTask={handlers.createTask}
            />
          </Suspense>
        </RouteLoadBoundary>
      );
    }

    if (activeView === "tasks") {
      return (
        <TasksPage
          agents={agents}
          tasks={tasks}
          onCreateTask={handlers.createTask}
          onRunTask={handlers.runTask}
          onRetryTask={handlers.retryTask}
          onCancelTask={handlers.cancelTask}
        />
      );
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
          onRegenerateDraft={handlers.regenerateDraft}
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
          onRegenerateDraft={handlers.regenerateDraft}
        />
      );
    }

    if (activeView === "settings") {
      return (
        <SettingsPage
          status={systemStatus}
          brandProfile={brandProfile}
          notifications={notifications}
          onSaveBrandProfile={handlers.saveBrandProfile}
          onMarkNotificationsRead={handlers.markNotificationsRead}
          onMarkNotificationRead={handlers.markNotificationRead}
        />
      );
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
        onRegenerateDraft={handlers.regenerateDraft}
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
