import type { Agent, BrandProfile, Draft, Notification, Platform, SystemStatus, Task, TaskPriority, User } from "../types/domain";
import {
  debugApi,
  errorFromResponse,
  networkErrorFromFetch,
  responseParseError,
  responseShapeError
} from "./error";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const REQUEST_TIMEOUT_MS = 30_000;

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

export type AgentMutationInput = {
  name: string;
  slug?: string;
  role: string;
  description: string;
  status?: Agent["status"];
  avatarType: string;
  config?: Record<string, unknown>;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function parseJson(response: Response, path: string) {
  const text = await response.text();

  if (!text) {
    throw responseParseError(response.status, path);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    debugApi("parse_error", {
      path,
      status: response.status,
      message: error instanceof Error ? error.message : "Invalid JSON"
    });
    throw responseParseError(response.status, path);
  }
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const init: RequestInit = {
    method: options.method ?? "GET",
    headers,
    cache: "no-store"
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    throw networkErrorFromFetch(error, path);
  } finally {
    window.clearTimeout(timeoutId);
  }

  debugApi("response", {
    path,
    status: response.status,
    ok: response.ok
  });

  if (!response.ok) {
    const payload = (await parseJson(response, path).catch((error) => {
      if (import.meta.env.DEV) {
        debugApi("error_payload_parse_failed", {
          path,
          status: response.status,
          message: error instanceof Error ? error.message : "Unknown parse error"
        });
      }
      return null;
    })) as Parameters<typeof errorFromResponse>[1];

    debugApi("error_payload", {
      path,
      status: response.status,
      payload
    });

    throw errorFromResponse(response.status, payload, path);
  }

  return (await parseJson(response, path)) as T;
}

async function requestData<T>(path: string, options: RequestOptions = {}) {
  const envelope = await request<ApiEnvelope<T>>(path, options);

  if (!isObject(envelope) || !("data" in envelope)) {
    debugApi("invalid_envelope", {
      path,
      envelope
    });
    throw responseShapeError(path);
  }

  return envelope.data as T;
}

async function requestObjectField<T>(path: string, field: string, options: RequestOptions = {}) {
  const payload = await request<Record<string, unknown>>(path, options);

  if (!isObject(payload) || !(field in payload)) {
    debugApi("invalid_shape", {
      path,
      expectedField: field,
      payload
    });
    throw responseShapeError(path);
  }

  return payload[field] as T;
}

export const api = {
  async login(email: string, password: string) {
    return request<AuthEnvelope>("/auth/login", {
      method: "POST",
      body: { email, password }
    });
  },

  async me(token: string) {
    const user = await requestObjectField<User>("/auth/me", "user", { token });
    return { user };
  },

  async getSystemStatus(token: string) {
    return requestData<SystemStatus>("/system/status", { token });
  },

  async getAgents(token: string) {
    return requestData<Agent[]>("/agents", { token });
  },

  async getAgent(token: string, id: string) {
    return requestData<Agent>(`/agents/${id}`, { token });
  },

  async updateAgent(token: string, id: string, body: Partial<Agent>) {
    return requestData<Agent>(`/agents/${id}`, {
      token,
      method: "PATCH",
      body
    });
  },

  async createAgent(token: string, body: AgentMutationInput) {
    return requestData<Agent>("/agents", {
      token,
      method: "POST",
      body
    });
  },

  async createTask(
    token: string,
    agentId: string,
    body: { title: string; prompt: string; platform?: Platform; priority?: TaskPriority; scheduledAt?: string | null }
  ) {
    return requestData<Task>(`/agents/${agentId}/tasks`, {
      token,
      method: "POST",
      body
    });
  },

  async getTasks(token: string) {
    return requestData<Task[]>("/tasks", { token });
  },

  async runTask(token: string, taskId: string) {
    return requestData<{ task: Task; draft: Draft }>(`/tasks/${taskId}/run`, {
      token,
      method: "POST"
    });
  },

  async retryTask(token: string, taskId: string) {
    return requestData<{ task: Task; draft: Draft }>(`/tasks/${taskId}/retry`, {
      token,
      method: "POST"
    });
  },

  async cancelTask(token: string, taskId: string) {
    return requestData<Task>(`/tasks/${taskId}/cancel`, {
      token,
      method: "POST"
    });
  },

  async getDrafts(token: string) {
    return requestData<Draft[]>("/drafts", { token });
  },

  async patchDraft(token: string, draftId: string, body: Partial<Draft>) {
    return requestData<Draft>(`/drafts/${draftId}`, {
      token,
      method: "PATCH",
      body
    });
  },

  async approveDraft(token: string, draftId: string) {
    return requestData<Draft>(`/drafts/${draftId}/approve`, {
      token,
      method: "POST"
    });
  },

  async rejectDraft(token: string, draftId: string, comment?: string) {
    return requestData<Draft>(`/drafts/${draftId}/reject`, {
      token,
      method: "POST",
      body: { comment }
    });
  },

  async requestRevision(token: string, draftId: string, comment?: string) {
    const response = await requestData<{ draft: Draft }>(`/drafts/${draftId}/request-revision`, {
      token,
      method: "POST",
      body: { comment }
    });
    return response.draft;
  },

  async regenerateDraft(token: string, draftId: string, comment?: string) {
    const response = await requestData<{ draft: Draft }>(`/drafts/${draftId}/regenerate`, {
      token,
      method: "POST",
      body: { comment }
    });
    return response.draft;
  },

  async getBrandProfile(token: string) {
    return requestData<BrandProfile>("/settings/brand-profile", { token });
  },

  async updateBrandProfile(token: string, body: Partial<BrandProfile>) {
    return requestData<BrandProfile>("/settings/brand-profile", {
      token,
      method: "PUT",
      body
    });
  },

  async getNotifications(token: string) {
    return requestData<Notification[]>("/system/notifications", { token });
  },

  async markAllNotificationsRead(token: string) {
    return requestData<Notification[]>("/system/notifications/read-all", {
      token,
      method: "POST"
    });
  },

  async markNotificationRead(token: string, notificationId: string) {
    return requestData<Notification>(`/system/notifications/${notificationId}/read`, {
      token,
      method: "POST"
    });
  }
};
