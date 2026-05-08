import type { Agent, BrandProfile, Draft, Notification, Platform, SystemStatus, Task, TaskPriority, User } from "../types/domain";
import { errorFromResponse } from "./error";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

type ApiEnvelope<T> = {
  data: T;
};

type AuthEnvelope = {
  token: string;
  user: User;
};

type RequestOptions = {
  token?: string;
  method?: "GET" | "POST" | "PATCH" | "PUT";
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}) {
  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const init: RequestInit = {
    method: options.method ?? "GET",
    headers
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, init);
  } catch (error) {
    throw error;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw errorFromResponse(response.status, payload);
  }

  return (await response.json()) as T;
}

export const api = {
  async login(email: string, password: string) {
    return request<AuthEnvelope>("/auth/login", {
      method: "POST",
      body: { email, password }
    });
  },

  async me(token: string) {
    return request<{ user: User }>("/auth/me", { token });
  },

  async getSystemStatus(token: string) {
    const response = await request<ApiEnvelope<SystemStatus>>("/system/status", { token });
    return response.data;
  },

  async getAgents(token: string) {
    const response = await request<ApiEnvelope<Agent[]>>("/agents", { token });
    return response.data;
  },

  async getAgent(token: string, id: string) {
    const response = await request<ApiEnvelope<Agent>>(`/agents/${id}`, { token });
    return response.data;
  },

  async updateAgent(token: string, id: string, body: Partial<Agent>) {
    const response = await request<ApiEnvelope<Agent>>(`/agents/${id}`, {
      token,
      method: "PATCH",
      body
    });
    return response.data;
  },

  async createTask(
    token: string,
    agentId: string,
    body: { title: string; prompt: string; platform?: Platform; priority?: TaskPriority; scheduledAt?: string | null }
  ) {
    const response = await request<ApiEnvelope<Task>>(`/agents/${agentId}/tasks`, {
      token,
      method: "POST",
      body
    });
    return response.data;
  },

  async getTasks(token: string) {
    const response = await request<ApiEnvelope<Task[]>>("/tasks", { token });
    return response.data;
  },

  async runTask(token: string, taskId: string) {
    const response = await request<ApiEnvelope<{ task: Task; draft: Draft }>>(`/tasks/${taskId}/run`, {
      token,
      method: "POST"
    });
    return response.data;
  },

  async retryTask(token: string, taskId: string) {
    const response = await request<ApiEnvelope<{ task: Task; draft: Draft }>>(`/tasks/${taskId}/retry`, {
      token,
      method: "POST"
    });
    return response.data;
  },

  async cancelTask(token: string, taskId: string) {
    const response = await request<ApiEnvelope<Task>>(`/tasks/${taskId}/cancel`, {
      token,
      method: "POST"
    });
    return response.data;
  },

  async getDrafts(token: string) {
    const response = await request<ApiEnvelope<Draft[]>>("/drafts", { token });
    return response.data;
  },

  async patchDraft(token: string, draftId: string, body: Partial<Draft>) {
    const response = await request<ApiEnvelope<Draft>>(`/drafts/${draftId}`, {
      token,
      method: "PATCH",
      body
    });
    return response.data;
  },

  async approveDraft(token: string, draftId: string) {
    const response = await request<ApiEnvelope<Draft>>(`/drafts/${draftId}/approve`, {
      token,
      method: "POST"
    });
    return response.data;
  },

  async rejectDraft(token: string, draftId: string, comment?: string) {
    const response = await request<ApiEnvelope<Draft>>(`/drafts/${draftId}/reject`, {
      token,
      method: "POST",
      body: { comment }
    });
    return response.data;
  },

  async requestRevision(token: string, draftId: string, comment?: string) {
    const response = await request<ApiEnvelope<{ draft: Draft }>>(`/drafts/${draftId}/request-revision`, {
      token,
      method: "POST",
      body: { comment }
    });
    return response.data.draft;
  },

  async regenerateDraft(token: string, draftId: string, comment?: string) {
    const response = await request<ApiEnvelope<{ draft: Draft }>>(`/drafts/${draftId}/regenerate`, {
      token,
      method: "POST",
      body: { comment }
    });
    return response.data.draft;
  },

  async getBrandProfile(token: string) {
    const response = await request<ApiEnvelope<BrandProfile>>("/settings/brand-profile", { token });
    return response.data;
  },

  async updateBrandProfile(token: string, body: Partial<BrandProfile>) {
    const response = await request<ApiEnvelope<BrandProfile>>("/settings/brand-profile", {
      token,
      method: "PUT",
      body
    });
    return response.data;
  },

  async getNotifications(token: string) {
    const response = await request<ApiEnvelope<Notification[]>>("/system/notifications", { token });
    return response.data;
  },

  async markAllNotificationsRead(token: string) {
    const response = await request<ApiEnvelope<Notification[]>>("/system/notifications/read-all", {
      token,
      method: "POST"
    });
    return response.data;
  },

  async markNotificationRead(token: string, notificationId: string) {
    const response = await request<ApiEnvelope<Notification>>(`/system/notifications/${notificationId}/read`, {
      token,
      method: "POST"
    });
    return response.data;
  }
};
