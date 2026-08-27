interface NavItem {
  label: string;
  icon: string;
  active?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { label: "Board", icon: "▚", active: true },
  { label: "Backlog", icon: "≣" },
  { label: "Sprints", icon: "◷" },
  { label: "Analytics", icon: "◔" },
];

const WORKSPACE_NAV: NavItem[] = [
  { label: "Team", icon: "◈" },
  { label: "Integrations", icon: "⌬" },
  { label: "Settings", icon: "⚙" },
];

function NavList({ items, label }: { items: NavItem[]; label: string }) {
  return (
    <div>
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.label}>
            <a
              href="#"
              aria-current={item.active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                item.active
                  ? "border border-neon-cyan/30 bg-cyan-500/10 font-semibold text-neon-cyan-soft"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <span className="w-4 text-center text-base" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="glass hidden w-60 shrink-0 flex-col justify-between border-r border-slate-800/60 p-4 lg:flex">
      <nav className="space-y-6">
        <NavList items={PRIMARY_NAV} label="Workflow" />
        <NavList items={WORKSPACE_NAV} label="Workspace" />
      </nav>

      <div className="rounded-xl border border-neon-magenta/25 bg-fuchsia-500/5 p-3">
        <p className="text-xs font-semibold text-neon-magenta-soft">
          TASKIRO-AI-LAB
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          Production workspace · managed by Kiro Agent
        </p>
      </div>
    </aside>
  );
}
