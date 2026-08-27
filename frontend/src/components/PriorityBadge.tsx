import type { Priority } from "@/types/task";

const STYLES: Record<Priority, string> = {
  low: "border-slate-600/60 text-slate-300 bg-slate-800/40",
  medium: "border-neon-cyan/40 text-neon-cyan-soft bg-cyan-500/10",
  high: "border-neon-magenta/40 text-neon-magenta-soft bg-fuchsia-500/10",
  critical: "border-rose-500/50 text-rose-300 bg-rose-500/10",
};

const LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STYLES[priority]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {LABELS[priority]}
    </span>
  );
}
