import { NavLink } from 'react-router-dom';
import { Gauge, AlertTriangle, Users, Truck, Trophy, Settings, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { clsx } from '../lib/utils';

const nav = [
  { to: '/',          icon: Gauge,        label: 'Dashboard' },
  { to: '/alerts',    icon: AlertTriangle, label: 'Alertas' },
  { to: '/rankings',  icon: Trophy,       label: 'Rankings' },
  { to: '/employees', icon: Users,        label: 'Funcionários' },
  { to: '/vehicles',  icon: Truck,        label: 'Veículos' },
];

const adminNav = [
  { to: '/admin', icon: Settings, label: 'Administração' },
];

export default function Sidebar() {
  const { user } = useAuth();
  const isAdmin = ['SUPERADMIN', 'ADMIN'].includes(user?.role);

  return (
    <aside className="w-60 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-zinc-100">Velocidade</div>
            <div className="text-xs text-zinc-500">Controle LEC</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              isActive
                ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            )}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
              Sistema
            </div>
            {adminNav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                )}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-zinc-800">
        <div className="text-xs text-zinc-500 truncate">{user?.name}</div>
        <div className="text-[10px] text-zinc-600 uppercase tracking-wider">{user?.role}</div>
      </div>
    </aside>
  );
}
