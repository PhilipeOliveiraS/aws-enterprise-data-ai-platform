import { useState } from "react";
import type { Column, Task, TaskStatus } from "@/types/task";
import { TaskCard } from "./TaskCard";

const ACCENT_DOT: Record<Column["accent"], string> = {
  cyan: "bg-neon-cyan",
  magenta: "bg-neon-magenta",
  amber: "bg-neutral-500",
};

const ACCENT_TEXT: Record<Column["accent"], string> = {
  cyan: "text-neon-cyan-soft",
  magenta: "text-neon-magenta-soft",
  amber: "text-neutral-300",
};

const ACCENT_DROP: Record<Column["accent"], string> = {
  cyan: "border-neon-cyan/70 bg-blue-500/10",
  magenta:
    "border-neon-magenta/70 bg-blue-500/10",
  amber:
    "border-neutral-500/70 bg-neutral-500/10",
};

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  busyIds: Set<string>;
  draggingId: string | null;
  onMove: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDropTask: (id: string) => void;
}

export function KanbanColumn({
  column,
  tasks,
  busyIds,
  draggingId,
  onMove,
  onDelete,
  onEdit,
  onDragStart,
  onDragEnd,
  onDropTask,
}: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);

  // Whether the currently dragged card originates from a different column.
  const draggingFromElsewhere =
    draggingId !== null && !tasks.some((t) => t.id === draggingId);

  const handleDragOver = (e: React.DragEvent) => {
    if (!draggingId) return;
    // Allow dropping.
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggingFromElsewhere && !isOver) setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Ignore leave events bubbling from children.
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const id = e.dataTransfer.getData("text/plain") || draggingId;
    if (id) onDropTask(id);
  };

  return (
    <section
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label={`${column.title} column`}
      className={`flex min-w-[280px] flex-1 flex-col rounded-2xl border p-3 transition-colors duration-150 ${
        isOver
          ? ACCENT_DROP[column.accent]
          : "border-neutral-800/60 bg-neutral-900/30"
      }`}
    >
      <header className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${ACCENT_DOT[column.accent]}`}
            aria-hidden
          />
          <h2
            className={`text-sm font-semibold uppercase tracking-wider ${ACCENT_TEXT[column.accent]}`}
          >
            {column.title}
          </h2>
        </div>
        <span className="rounded-md border border-neutral-700/60 bg-neutral-800/50 px-2 py-0.5 text-xs font-medium text-neutral-400">
          {tasks.length}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-3" role="list">
        {tasks.length === 0 ? (
          <p
            className={`rounded-xl border border-dashed px-3 py-6 text-center text-xs transition-colors ${
              isOver
                ? "border-neutral-500 text-neutral-300"
                : "border-neutral-700/60 text-neutral-600"
            }`}
          >
            {draggingFromElsewhere ? "Drop here" : "No tasks"}
          </p>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              busy={busyIds.has(task.id)}
              dragging={draggingId === task.id}
              onMove={onMove}
              onDelete={onDelete}
              onEdit={onEdit}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </section>
  );
}
