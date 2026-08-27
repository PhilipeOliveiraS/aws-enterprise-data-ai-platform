export type TaskStatus = "todo" | "in-progress" | "done";

export type Priority = "low" | "medium" | "high" | "critical";

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

/** Matches the backend TaskDTO. */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  tags: string[];
  assignee: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  subtasks: Subtask[];
  subtaskTotal: number;
  subtaskCompleted: number;
}

export interface Column {
  id: TaskStatus;
  title: string;
  accent: "cyan" | "magenta" | "amber";
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}
