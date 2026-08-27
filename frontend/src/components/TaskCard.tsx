import type { Task, TaskStatus } from "@/types/task";
import { PriorityBadge } from "./PriorityBadge";

interface TaskCardProps {
  task: Task;
  onMove: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  busy?: boolean;
  dragging?: boolean;
}

const MOVE_TARGETS: Record<TaskStatus, { label: string; to: TaskStatus }[]> = {
  todo: [{ label: "Start →", to: "in-progress" }],
  "in-progress": [
    { label: "← Back", to: "todo" },
    { label: "Done →", to: "done" },
  ],
  done: [{ label: "← Reopen", to: "in-progress" }],
};

export function TaskCard({
  task,
  onMove,
  onDelete,
  onEdit,
  onDragStart,
  onDragEnd,
  busy,
  dragging,
}: TaskCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart(task.id);
  };

  return (
    <article
      draggable={!busy}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className={`glass group rounded-xl p-4 transition duration-200 hover:border-neon-cyan/40 ${
        busy ? "opacity-50" : "cursor-grab active:cursor-grabbing"
      } ${dragging ? "scale-[0.98] opacity-40 ring-1 ring-neon-cyan/60" : ""}`}
      role="listitem"
      aria-grabbed={dragging || undefined}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-wider text-neutral-500">
          {task.id.slice(0, 8)}
        </span>
        <PriorityBadge priority={task.priority} />
      </div>

      <h3 className="text-sm font-semibold leading-snug text-neutral-100 group-hover:text-neutral-50">
        {task.title}
      </h3>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-400">
        {task.description}
      </p>

      {task.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-neutral-700/60 bg-neutral-800/40 px-1.5 py-0.5 text-[10px] text-neutral-400"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {task.subtaskTotal > 0 && (
        <div className="mt-3" aria-hidden="false">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
              {task.subtaskCompleted} of {task.subtaskTotal} subtasks completed
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800/70">
            <div
              className="h-full rounded-full bg-neon-cyan transition-[width] duration-300"
              style={{
                width: `${(task.subtaskCompleted / task.subtaskTotal) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-neutral-800/60 pt-3">
        <div className="flex gap-1.5">
          {MOVE_TARGETS[task.status].map((target) => (
            <button
              key={target.to}
              type="button"
              disabled={busy}
              draggable={false}
              onClick={() => onMove(task.id, target.to)}
              className="rounded-md border border-neon-cyan/30 bg-blue-500/5 px-2 py-1 text-[11px] font-medium text-neon-cyan-soft transition hover:bg-blue-500/15 disabled:opacity-50"
            >
              {target.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            disabled={busy}
            draggable={false}
            onClick={() => onEdit(task.id)}
            aria-label="Edit task"
            title="Edit task"
            className="rounded-md border border-neon-cyan/30 bg-blue-500/5 px-2 py-1 text-[11px] font-medium text-neon-cyan-soft transition hover:bg-blue-500/15 disabled:opacity-50"
          >
            ✎
          </button>
          <button
            type="button"
            disabled={busy}
            draggable={false}
            onClick={() => onDelete(task.id)}
            aria-label="Delete task"
            title="Delete task"
            className="rounded-md border border-neutral-700/60 px-2 py-1 text-[11px] text-neutral-400 transition hover:border-rose-500/50 hover:text-rose-300 disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      </div>
    </article>
  );
}
