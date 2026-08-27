import type { AuthUser, Priority, Subtask, Task, TaskStatus } from "@/types/task";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const TOKEN_KEY = "taskiro.token";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = tokenStore.get();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
  });

  if (res.status === 204) return undefined as T;

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    if (payload && typeof payload === "object" && "error" in payload) {
      message = String((payload as { error: unknown }).error);
    }
    throw new ApiError(res.status, message);
  }

  return payload as T;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface TaskDraft {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  tags?: string[];
  assignee?: string;
}

export const api = {
  register: (input: {
    email: string;
    password: string;
    displayName: string;
  }) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      auth: false,
      body: JSON.stringify(input),
    }),

  login: (input: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify(input),
    }),

  me: () => request<AuthUser>("/auth/me"),

  listTasks: () => request<Task[]>("/tasks"),

  createTask: (draft: TaskDraft) =>
    request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(draft),
    }),

  updateTask: (id: string, patch: Partial<TaskDraft>) =>
    request<Task>(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),

  moveTask: (id: string, status: TaskStatus) =>
    request<Task>(`/tasks/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  deleteTask: (id: string) =>
    request<void>(`/tasks/${id}`, { method: "DELETE" }),

  addSubtask: (taskId: string, title: string) =>
    request<Subtask>(`/tasks/${taskId}/subtasks`, {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  toggleSubtask: (taskId: string, subtaskId: string) =>
    request<Subtask>(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`, {
      method: "PATCH",
    }),

  deleteSubtask: (taskId: string, subtaskId: string) =>
    request<void>(`/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: "DELETE",
    }),
};
