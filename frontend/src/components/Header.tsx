interface HeaderProps {
  onAddTask: () => void;
  userInitials: string;
  userName: string;
  onLogout: () => void;
}

export function Header({
  onAddTask,
  userInitials,
  userName,
  onLogout,
}: HeaderProps) {
  return (
    <header className="glass sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-neutral-800/60 px-6 py-3">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg border border-neon-cyan/40 bg-blue-500/10 shadow-neon-cyan">
          <span className="text-lg font-black text-neon-cyan-soft">T</span>
        </div>
        <div className="leading-tight">
          <h1 className="text-base font-bold tracking-tight text-neutral-50">
            Tas<span className="text-neon-cyan-soft">Kiro</span>
          </h1>
          <p className="text-[11px] text-neutral-500">Enterprise Task Command</p>
        </div>
      </div>

      <div className="hidden flex-1 items-center md:flex">
        <div className="relative w-full max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
            ⌕
          </span>
          <input
            type="search"
            placeholder="Search tasks, tags, assignees…"
            className="w-full rounded-lg border border-neutral-800/70 bg-neutral-900/60 py-2 pl-9 pr-3 text-sm text-neutral-200 placeholder:text-neutral-600 transition focus:border-neon-cyan/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAddTask}
          className="rounded-lg border border-neon-cyan/50 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-neon-cyan-soft shadow-neon-cyan transition hover:bg-blue-500/20 active:scale-[0.98]"
        >
          + Add Task
        </button>
        <div
          className="grid h-9 w-9 place-items-center rounded-full border border-neon-magenta/50 bg-blue-500/10 text-xs font-bold text-neon-magenta-soft"
          title={`Signed in as ${userName}`}
        >
          {userInitials}
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg border border-neutral-700/60 px-3 py-2 text-sm font-medium text-neutral-400 transition hover:border-rose-500/50 hover:text-rose-300"
          title="Sign out"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
