import { Edit3, Plus, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { getGeneralErrorMessage } from "../api/error";
import { AgentCard } from "../components/AgentCard";
import { AgentModal } from "../components/agents/AgentModal";
import type { AgentFormValues } from "../components/agents/AgentForm";
import { LoadingButton } from "../components/forms/LoadingButton";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../components/toast/ToastProvider";
import type { Agent, AgentStatus } from "../types/domain";

type Props = {
  agents: Agent[];
  onOpenAgent: (agent: Agent) => void;
  onCreateAgent: (body: AgentFormValues) => Promise<Agent | void>;
  onUpdateAgent: (agentId: string, body: Partial<Agent>) => Promise<void>;
  onPauseAgent: (agentId: string) => Promise<void>;
};

const statusFilters: Array<AgentStatus | "all"> = ["all", "idle", "working", "waiting_approval", "error"];

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export function AgentsPage({ agents, onOpenAgent, onCreateAgent, onUpdateAgent, onPauseAgent }: Props) {
  const [statusFilter, setStatusFilter] = useState<AgentStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [busyAgentId, setBusyAgentId] = useState<string | null>(null);
  const toast = useToast();

  const visibleAgents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return agents.filter((agent) => {
      const matchesStatus = statusFilter === "all" || agent.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        [agent.name, agent.slug, agent.role, agent.description].some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [agents, query, statusFilter]);

  async function createAgent(values: AgentFormValues) {
    setSaving(true);
    setModalError(null);
    try {
      const agent = await onCreateAgent(values);
      setCreating(false);
      toast.success("Agente creato", agent?.name ?? values.name);
    } catch (err) {
      const message = getGeneralErrorMessage(err);
      setModalError(message);
      toast.error("Errore creazione agente", message);
    } finally {
      setSaving(false);
    }
  }

  async function updateAgent(values: AgentFormValues) {
    if (!editingAgent) {
      return;
    }

    setSaving(true);
    setModalError(null);
    try {
      await onUpdateAgent(editingAgent.id, values);
      setEditingAgent(null);
      toast.success("Agente aggiornato", values.name);
    } catch (err) {
      const message = getGeneralErrorMessage(err);
      setModalError(message);
      toast.error("Errore modifica agente", message);
    } finally {
      setSaving(false);
    }
  }

  async function pauseAgent(agent: Agent) {
    setBusyAgentId(agent.id);
    try {
      await onPauseAgent(agent.id);
      toast.success("Agente messo in pausa", agent.name);
    } catch (err) {
      toast.error("Errore pausa agente", getGeneralErrorMessage(err));
    } finally {
      setBusyAgentId(null);
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Agents</h2>
          <p className="mt-1 text-sm text-slate-500">Crea, modifica e controlla gli agenti operativi.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setModalError(null);
            setCreating(true);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          <Plus size={16} />
          Nuovo agente
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca per nome, slug, ruolo..."
            className="h-11 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as AgentStatus | "all")}
            className="h-11 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
          >
            {statusFilters.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "Tutti gli stati" : status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {visibleAgents.map((agent) => {
          const config = asRecord(agent.config);
          return (
            <article key={agent.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/8 backdrop-blur-xl">
              <AgentCard agent={agent} onOpen={onOpenAgent} />
              <div className="border-t border-white/10 bg-slate-950/28 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <StatusBadge kind="agent" status={agent.status} />
                  <span className="rounded-full border border-white/10 px-2 py-1">avatar: {agent.avatarType}</span>
                  {config.platformTarget ? (
                    <span className="rounded-full border border-white/10 px-2 py-1">platform: {String(config.platformTarget)}</span>
                  ) : null}
                  {config.basePrompt ? (
                    <span className="rounded-full border border-white/10 px-2 py-1">prompt configured</span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <LoadingButton
                    type="button"
                    loading={busyAgentId === agent.id}
                    loadingLabel="Pausa..."
                    onClick={() => void pauseAgent(agent)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-slate-200 transition hover:bg-white/10"
                  >
                    <SlidersHorizontal size={15} />
                    Pausa
                  </LoadingButton>
                  <button
                    type="button"
                    onClick={() => {
                      setModalError(null);
                      setEditingAgent(agent);
                    }}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm text-white transition hover:bg-white/16"
                  >
                    <Edit3 size={15} />
                    Modifica
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {visibleAgents.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/8 p-6 text-sm text-slate-400 backdrop-blur-xl">
          Nessun agente trovato.
        </div>
      ) : null}

      {creating ? (
        <AgentModal
          title="Crea agente"
          description="Aggiungi un nuovo agente operativo con avatar fallback e config futura."
          submitLabel="Crea agente"
          loading={saving}
          error={modalError}
          onClose={() => setCreating(false)}
          onSubmit={createAgent}
        />
      ) : null}

      {editingAgent ? (
        <AgentModal
          title={`Modifica ${editingAgent.name}`}
          description="Aggiorna identita, status, avatar e config operativa."
          submitLabel="Salva agente"
          agent={editingAgent}
          loading={saving}
          error={modalError}
          onClose={() => setEditingAgent(null)}
          onSubmit={updateAgent}
        />
      ) : null}
    </section>
  );
}
