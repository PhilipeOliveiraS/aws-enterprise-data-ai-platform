import { useEffect, useState } from "react";
import type { Priority, Subtask, Task } from "@/types/task";
import { api, ApiError } from "@/lib/api";

interface EditTaskModalProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (
    id: string,
    patch: {
      title: string;
      description: string;
      priority: Priority;
      tags: string[];
      assignee: string;
    },
  ) => Promise<void> | void;
  /**
   * Notifies the parent that a task's subtasks changed (added/toggled/deleted).
   * Lets the board keep TaskCard progress counts in sync immediately, without
   * a full re-fetch or coupling subtask edits to the Save Changes flow.
   */
  onSubtasksChanged?: (taskId: string, subtasks: Subtask[]) => void;
}

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function EditTaskModal({
  open,
  task,
  onClose,
  onSave,
  onSubtasksChanged,
}: EditTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [tags, setTags] = useState("");
  const [assignee, setAssignee] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Subtasks (mutated immediately against the API, independent of Save).
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskError, setSubtaskError] = useState<string | null>(null);
  // Ids of subtasks with an in-flight request (disables their controls).
  const [pendingSubtaskIds, setPendingSubtaskIds] = useState<Set<string>>(
    new Set(),
  );

  const setSubtaskPending = (id: string, pending: boolean) => {
    setPendingSubtaskIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Seed the form from the task whenever it changes/opens.
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
      setTags(task.tags.join(", "));
      setAssignee(task.assignee);
      setTitleError(null);
      setSubmitting(false);
      setSubtasks(task.subtasks ?? []);
      setNewSubtask("");
      setAddingSubtask(false);
      setSubtaskError(null);
      setPendingSubtaskIds(new Set());
    }
  }, [task]);

  if (!open || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() === "") {
      setTitleError("Title is required.");
      return;
    }
    setTitleError(null);
    setSubmitting(true);
    try {
      await onSave(task.id, {
        title: title.trim(),
        description: description.trim(),
        priority,
        tags: parseTags(tags),
        assignee: assignee.trim(),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const subtaskErrorMessage = (err: unknown, fallback: string) =>
    err instanceof ApiError ? err.message : fallback;

  const handleAddSubtask = async () => {
    if (!task) return;
    const trimmed = newSubtask.trim();
    if (trimmed === "" || addingSubtask) return;
    setAddingSubtask(true);
    setSubtaskError(null);
    try {
      const created = await api.addSubtask(task.id, trimmed);
      setSubtasks((prev) => {
        const next = [...prev, created];
        onSubtasksChanged?.(task.id, next);
        return next;
      });
      setNewSubtask("");
    } catch (err) {
      setSubtaskError(subtaskErrorMessage(err, "Failed to add subtask."));
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (sub: Subtask) => {
    if (!task || pendingSubtaskIds.has(sub.id)) return;
    setSubtaskPending(sub.id, true);
    setSubtaskError(null);
    try {
      const updated = await api.toggleSubtask(task.id, sub.id);
      setSubtasks((prev) => {
        const next = prev.map((s) => (s.id === updated.id ? updated : s));
        onSubtasksChanged?.(task.id, next);
        return next;
      });
    } catch (err) {
      setSubtaskError(subtaskErrorMessage(err, "Failed to update subtask."));
    } finally {
      setSubtaskPending(sub.id, false);
    }
  };

  const handleDeleteSubtask = async (sub: Subtask) => {
    if (!task || pendingSubtaskIds.has(sub.id)) return;
    setSubtaskPending(sub.id, true);
    setSubtaskError(null);
    try {
      await api.deleteSubtask(task.id, sub.id);
      setSubtasks((prev) => {
        const next = prev.filter((s) => s.id !== sub.id);
        onSubtasksChanged?.(task.id, next);
        return next;
      });
    } catch (err) {
      setSubtaskError(subtaskErrorMessage(err, "Failed to delete subtask."));
      setSubtaskPending(sub.id, false);
    }
  };

  const completedCount = subtasks.filter((s) => s.completed).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-task-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-neutral-950/70 backdrop-blur-sm"
      />

      {/* Panel */}
      <div className="glass glass-cyan animate-pop-in relative w-full max-w-lg rounded-2xl p-6">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2
              id="edit-task-title"
              className="text-lg font-bold tracking-tight text-neutral-50"
            >
              Edit Task
            </h2>
            <p className="text-xs text-neutral-500">Update an existing item</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg border border-neutral-700/60 text-neutral-400 transition hover:border-neon-magenta/50 hover:text-neon-magenta-soft"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="edit-task-title-input"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400"
            >
              Title
            </label>
            <input
              id="edit-task-title-input"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(null);
              }}
              placeholder="e.g. Configure ALB target group"
              autoFocus
              aria-invalid={titleError ? true : undefined}
              className="w-full rounded-lg border border-neutral-800/70 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 transition focus:border-neon-cyan/50"
            />
            {titleError && (
              <p
                role="alert"
                className="mt-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300"
              >
                {titleError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="edit-task-desc"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400"
            >
              Description
            </label>
            <textarea
              id="edit-task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Short summary of the work…"
              className="w-full resize-none rounded-lg border border-neutral-800/70 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 transition focus:border-neon-cyan/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-task-priority"
                className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400"
              >
                Priority
              </label>
              <select
                id="edit-task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full rounded-lg border border-neutral-800/70 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 transition focus:border-neon-cyan/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="edit-task-assignee"
                className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400"
              >
                Assignee
              </label>
              <input
                id="edit-task-assignee"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="e.g. Neo Anderson"
                className="w-full rounded-lg border border-neutral-800/70 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 transition focus:border-neon-cyan/50"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-task-tags"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400"
            >
              Tags
            </label>
            <input
              id="edit-task-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma-separated, e.g. infra, urgent"
              className="w-full rounded-lg border border-neutral-800/70 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 transition focus:border-neon-cyan/50"
            />
          </div>

          <div className="border-t border-neutral-800/60 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Subtasks
              </span>
              {subtasks.length > 0 && (
                <span className="text-[11px] font-medium text-neon-cyan-soft">
                  {completedCount} of {subtasks.length} completed
                </span>
              )}
            </div>

            {subtaskError && (
              <p
                role="alert"
                className="mb-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300"
              >
                {subtaskError}
              </p>
            )}

            {subtasks.length > 0 && (
              <ul className="mb-3 space-y-1.5">
                {subtasks.map((sub) => {
                  const pending = pendingSubtaskIds.has(sub.id);
                  return (
                    <li
                      key={sub.id}
                      className="flex items-center gap-2 rounded-lg border border-neutral-800/60 bg-neutral-900/40 px-2.5 py-1.5"
                    >
                      <input
                        type="checkbox"
                        checked={sub.completed}
                        disabled={pending}
                        aria-label={`Mark "${sub.title}" as ${
                          sub.completed ? "incomplete" : "complete"
                        }`}
                        onChange={() => handleToggleSubtask(sub)}
                        className="h-4 w-4 shrink-0 cursor-pointer accent-neon-cyan disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <span
                        className={`flex-1 text-sm transition ${
                          sub.completed
                            ? "text-neutral-500 line-through"
                            : "text-neutral-200"
                        }`}
                      >
                        {sub.title}
                      </span>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleDeleteSubtask(sub)}
                        aria-label={`Delete subtask "${sub.title}"`}
                        title="Delete subtask"
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-neutral-700/60 text-xs text-neutral-400 transition hover:border-rose-500/50 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex gap-2">
              <input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleAddSubtask();
                  }
                }}
                placeholder="Add a subtask…"
                aria-label="New subtask title"
                className="w-full rounded-lg border border-neutral-800/70 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 transition focus:border-neon-cyan/50"
              />
              <button
                type="button"
                onClick={() => void handleAddSubtask()}
                disabled={addingSubtask || newSubtask.trim() === ""}
                className="shrink-0 rounded-lg border border-neon-cyan/50 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-neon-cyan-soft shadow-neon-cyan transition hover:bg-blue-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addingSubtask ? "Adding…" : "Add"}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-700/60 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800/50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg border border-neon-cyan/50 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-neon-cyan-soft shadow-neon-cyan transition hover:bg-blue-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
