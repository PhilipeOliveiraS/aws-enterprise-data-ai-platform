export type TaskStatus = "todo" | "in-progress" | "done";
export type Priority = "low" | "medium" | "high" | "critical";

export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  created_at: string;
}

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  tags: string; // JSON-encoded string[]
  assignee: string;
  position: number;
  due_date: string | null; // ISO date (YYYY-MM-DD) or null when unset
  created_at: string;
  updated_at: string;
}

export interface SubtaskRow {
  id: string;
  task_id: string;
  title: string;
  completed: number;
  created_at: string;
}

export interface SubtaskDTO {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export function toSubtaskDTO(row: SubtaskRow): SubtaskDTO {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    completed: row.completed === 1,
    createdAt: row.created_at,
  };
}

/** Public shape returned by the API (tags decoded, no user_id leak). */
export interface TaskDTO {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  tags: string[];
  assignee: string;
  position: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks: SubtaskDTO[];
  subtaskTotal: number;
  subtaskCompleted: number;
}

export function toTaskDTO(row: TaskRow, subtasks: SubtaskDTO[] = []): TaskDTO {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(row.tags);
    if (Array.isArray(parsed)) tags = parsed.map(String);
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    tags,
    assignee: row.assignee,
    position: row.position,
    dueDate: row.due_date ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    subtasks,
    subtaskTotal: subtasks.length,
    subtaskCompleted: subtasks.filter((s) => s.completed).length,
  };
}
