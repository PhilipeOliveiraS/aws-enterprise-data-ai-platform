import type { Column } from "@/types/task";

export const COLUMNS: Column[] = [
  { id: "todo", title: "To Do", accent: "cyan" },
  { id: "in-progress", title: "In Progress", accent: "magenta" },
  { id: "done", title: "Done", accent: "amber" },
];
