import type { AgentStatus, DraftStatus, RiskLevel, TaskStatus } from "../types/domain";

export const agentStatusLabel: Record<AgentStatus, string> = {
  idle: "Idle",
  working: "Working",
  waiting_approval: "In approvazione",
  error: "Errore"
};

export const taskStatusLabel: Record<TaskStatus, string> = {
  pending: "Pending",
  running: "Running",
  completed: "Completato",
  waiting_approval: "Da approvare",
  rejected: "Rifiutato",
  revision_requested: "Revisione richiesta",
  failed: "Fallito"
};

export const draftStatusLabel: Record<DraftStatus, string> = {
  draft: "Bozza",
  waiting_approval: "Da approvare",
  approved: "Approvata",
  rejected: "Rifiutata",
  revision_requested: "Revisione"
};

export const riskLabel: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High"
};
