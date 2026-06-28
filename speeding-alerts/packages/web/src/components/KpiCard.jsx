import { clsx } from '../lib/utils';

export default function KpiCard({ icon: Icon, label, value, sub, color = 'red', loading }) {
  const colorMap = {
    red:    'text-red-400    bg-red-900/30    border-red-700/30',
    orange: 'text-orange-400 bg-orange-900/30 border-orange-700/30',
    yellow: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/30',
    blue:   'text-blue-400   bg-blue-900/30   border-blue-700/30',
    green:  'text-green-400  bg-green-900/30  border-green-700/30',
    zinc:   'text-zinc-400   bg-zinc-800      border-zinc-700',
  };

  return (
    <div className="card flex items-start gap-4">
      <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center border shrink-0', colorMap[color])}>
        {Icon && <Icon size={18} />}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">{label}</div>
        {loading
          ? <div className="h-7 w-16 bg-zinc-800 rounded animate-pulse" />
          : <div className="text-2xl font-bold text-zinc-100">{value ?? '—'}</div>
        }
        {sub && <div className="text-xs text-zinc-500 mt-1 truncate">{sub}</div>}
      </div>
    </div>
  );
}
