import { useCallback, useEffect, useMemo, useState } from "react";
import type { Priority, Subtask, Task, TaskStatus } from "@/types/task";
import { COLUMNS } from "@/data/columns";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { KanbanColumn } from "./KanbanColumn";
import { AddTaskModal } from "./AddTaskModal";
import { EditTaskModal } from "./EditTaskModal";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Dashboard() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const setBusy = useCallback((id: string, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTasks(await api.listTasks());
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load tasks. Is the API running?",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const tasksByColumn = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      "in-progress": [],
      done: [],
    };
    for (const task of tasks) grouped[task.status].push(task);
    return grouped;
  }, [tasks]);

  const handleCreate = useCallback(
    async (draft: {
      title: string;
      description: string;
      priority: Priority;
      status: TaskStatus;
    }) => {
      const created = await api.createTask(draft);
      setTasks((prev) => [...prev, created]);
    },
    [],
  );

  const handleMove = useCallback(
    async (id: string, status: TaskStatus) => {
      // Skip the round-trip if the task is already in the target column.
      const current = tasks.find((t) => t.id === id);
      if (!current || current.status === status) return;

      // Optimistic update: move the card immediately, keep a snapshot to roll back.
      const snapshot = tasks;
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status } : t)),
      );
      setBusy(id, true);
      try {
        const updated = await api.moveTask(id, status);
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
        setError(null);
      } catch {
        setError("Failed to move task.");
        setTasks(snapshot); // rollback
      } finally {
        setBusy(id, false);
      }
    },
    [tasks, setBusy],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setBusy(id, true);
      try {
        await api.deleteTask(id);
        setTasks((prev) => prev.filter((t) => t.id !== id));
      } catch {
        setError("Failed to delete task.");
        setBusy(id, false);
      }
    },
    [setBusy],
  );

  const handleEdit = useCallback(
    (id: string) => {
      const target = tasks.find((t) => t.id === id);
      if (target) setEditingTask(target);
    },
    [tasks],
  );

  const handleSave = useCallback(
    async (
      id: string,
      patch: {
        title: string;
        description: string;
        priority: Priority;
        tags: string[];
        assignee: string;
      },
    ) => {
      setBusy(id, true);
      try {
        const updated = await api.updateTask(id, patch);
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
        setError(null);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Failed to update task.",
        );
        throw err;
      } finally {
        setBusy(id, false);
      }
    },
    [setBusy],
  );

  const handleSubtasksChanged = useCallback(
    (taskId: string, subtasks: Subtask[]) => {
      const subtaskTotal = subtasks.length;
      const subtaskCompleted = subtasks.filter((s) => s.completed).length;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, subtasks, subtaskTotal, subtaskCompleted }
            : t,
        ),
      );
    },
    [],
  );

  const displayName = user?.displayName ?? "Agent";

  return (
    <div className="relative z-10 flex h-full flex-col">
      <Header
        onAddTask={() => setModalOpen(true)}
        userInitials={initialsOf(displayName)}
        userName={displayName}
        onLogout={logout}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-50">
                Sprint Board
              </h2>
              <p className="text-sm text-neutral-500">
                {loading
                  ? "Syncing…"
                  : `${tasks.length} tasks · Production workspace`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-lg border border-neon-magenta/50 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-neon-magenta-soft shadow-neon-magenta transition hover:bg-blue-500/20 active:scale-[0.98] lg:hidden"
            >
              + Add
            </button>
          </div>

          {error && (
            <div className="mx-6 mb-3 flex items-center justify-between rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">
              <span>{error}</span>
              <button
                type="button"
                onClick={loadTasks}
                className="rounded-md border border-rose-500/40 px-2 py-1 text-xs hover:bg-rose-500/10"
              >
                Retry
              </button>
            </div>
          )}

          <div className="flex flex-1 gap-4 overflow-x-auto px-6 pb-6">
            {loading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
                Loading board…
              </div>
            ) : (
              COLUMNS.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={tasksByColumn[column.id]}
                  busyIds={busyIds}
                  draggingId={draggingId}
                  onMove={handleMove}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onDragStart={setDraggingId}
                  onDragEnd={() => setDraggingId(null)}
                  onDropTask={(id) => handleMove(id, column.id)}
                />
              ))
            )}
          </div>
        </main>
      </div>

      <AddTaskModal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />

      <EditTaskModal
        open={editingTask !== null}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleSave}
        onSubtasksChanged={handleSubtasksChanged}
      />
    </div>
  );
}
