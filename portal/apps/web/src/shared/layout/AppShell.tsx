import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../store/auth";
import { useUI } from "../../store/ui";
import { NAV } from "../../app/navigation";

export function AppShell() {
  const { user, logout, can } = useAuth();
  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useUI();
  const location = useLocation();

  const visible = NAV.filter((item) => can(item.permission));

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-slate-900 ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-800">
          <div className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-brand font-mono text-sm font-bold text-white">
            P
          </div>
          {!sidebarCollapsed && <span className="truncate font-semibold">Portal Op.</span>}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-brand-soft font-medium text-brand-ink dark:bg-brand/20 dark:text-brand-soft"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`
              }
              title={item.label}
            >
              <span className="w-5 flex-none text-center font-mono">{item.glyph}</span>
              {!sidebarCollapsed && (
                <span className="flex-1 truncate">{item.label}</span>
              )}
              {!sidebarCollapsed && item.soon && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 dark:bg-slate-800">
                  em breve
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={toggleSidebar}
          className="border-t border-slate-200 py-2.5 text-slate-400 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
          title={sidebarCollapsed ? "Expandir" : "Recolher"}
        >
          {sidebarCollapsed ? "»" : "«"}
        </button>
      </aside>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 flex-none items-center gap-4 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="relative flex-1 max-w-md">
            <input
              placeholder="Pesquisa global…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <button
            onClick={toggleTheme}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Alternar tema"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium leading-tight">{user?.name}</div>
              <div className="font-mono text-[11px] text-slate-400">{user?.roles.join(", ")}</div>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft font-semibold text-brand-ink dark:bg-brand/20 dark:text-brand-soft">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={() => logout()}
              className="text-sm text-slate-500 hover:text-red-600"
              title="Sair"
            >
              Sair
            </button>
          </div>
        </header>

        <main key={location.pathname} className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
