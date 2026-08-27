import { useEffect, useState } from "react";
import type { Priority, TaskStatus } from "@/types/task";

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (draft: {
    title: string;
    description: string;
    priority: Priority;
    status: TaskStatus;
  }) => Promise<void> | void;
}

export function AddTaskModal({ open, onClose, onCreate }: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset the form whenever the modal is opened fresh.
  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setStatus("todo");
      setTitleError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() === "") {
      setTitleError("Title is required.");
      return;
    }
    setTitleError(null);
    setSubmitting(true);
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-task-title"
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
              id="add-task-title"
              className="text-lg font-bold tracking-tight text-neutral-50"
            >
              Create Task
            </h2>
            <p className="text-xs text-neutral-500">
              Add a new item to the board
            </p>
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
              htmlFor="task-title"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400"
            >
              Title
            </label>
            <input
              id="task-title"
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
              htmlFor="task-desc"
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400"
            >
              Description
            </label>
            <textarea
              id="task-desc"
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
                htmlFor="task-priority"
                className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400"
              >
                Priority
              </label>
              <select
                id="task-priority"
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
                htmlFor="task-column"
                className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400"
              >
                Column
              </label>
              <select
                id="task-column"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-lg border border-neutral-800/70 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 transition focus:border-neon-cyan/50"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
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
              className="rounded-lg border border-neon-magenta/50 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-neon-magenta-soft shadow-neon-magenta transition hover:bg-blue-500/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
