import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  AlertTriangle, Users, Truck, TrendingUp,
  Clock, MapPin, Activity, Award
} from 'lucide-react';
import api from '../lib/api';
import KpiCard from '../components/KpiCard';
import SeverityBadge from '../components/SeverityBadge';
import { fmtDateTime, fmtRelative } from '../lib/utils';

const fetchKpis    = () => api.get('/dashboard/kpis').then(r => r.data);
const fetchRecent  = () => api.get('/dashboard/recent?limit=15').then(r => r.data);
const fetchMonthly = () => api.get('/dashboard/chart/monthly').then(r => r.data);
const fetchWeekday = () => api.get('/dashboard/chart/weekday').then(r => r.data);
const fetchTopEmp  = () => api.get('/dashboard/ranking/employees?limit=5&period=30').then(r => r.data);

export default function Dashboard() {
  const { data: kpis, isLoading: kLoading } = useQuery({ queryKey: ['kpis'],    queryFn: fetchKpis,    refetchInterval: 30_000 });
  const { data: recent }  = useQuery({ queryKey: ['recent'],  queryFn: fetchRecent,  refetchInterval: 15_000 });
  const { data: monthly } = useQuery({ queryKey: ['monthly'], queryFn: fetchMonthly, staleTime: 300_000 });
  const { data: weekday } = useQuery({ queryKey: ['weekday'], queryFn: fetchWeekday, staleTime: 300_000 });
  const { data: topEmp }  = useQuery({ queryKey: ['topEmp'],  queryFn: fetchTopEmp,  refetchInterval: 60_000 });

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500">Monitoramento de excesso de velocidade em tempo real</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Activity}      label="Hoje"       value={kpis?.today}         color="red"    loading={kLoading} />
        <KpiCard icon={Clock}         label="Últimas 24h" value={kpis?.last_24h}     color="orange" loading={kLoading} />
        <KpiCard icon={AlertTriangle} label="Esta semana" value={kpis?.this_week}    color="yellow" loading={kLoading} />
        <KpiCard icon={TrendingUp}    label="Este mês"    value={kpis?.this_month}   color="blue"   loading={kLoading} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={TrendingUp} label="Excesso médio/mês"
          value={kpis?.avg_excess_month ? `${parseFloat(kpis.avg_excess_month).toFixed(0)} km/h` : '—'}
          color="orange" loading={kLoading} />
        <KpiCard icon={AlertTriangle} label="Maior excesso/mês"
          value={kpis?.max_excess_month ? `${kpis.max_excess_month} km/h` : '—'}
          color="red" loading={kLoading} />
        <KpiCard icon={Users} label="Motoristas/mês"   value={kpis?.drivers_month}  color="zinc" loading={kLoading} />
        <KpiCard icon={Truck} label="Veículos/mês"     value={kpis?.vehicles_month} color="zinc" loading={kLoading} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly evolution */}
        <div className="card">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Evolução Mensal (12 meses)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthly || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 10 }} />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} labelStyle={{ color: '#e4e4e7' }} />
              <Area type="monotone" dataKey="total" stroke="#ef4444" fill="url(#grad)" strokeWidth={2} name="Alertas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Weekday distribution */}
        <div className="card">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Por Dia da Semana (30 dias)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekday || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="day_name" tick={{ fill: '#71717a', fontSize: 10 }} />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} labelStyle={{ color: '#e4e4e7' }} />
              <Bar dataKey="total" fill="#ef4444" radius={[4,4,0,0]} name="Alertas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent alerts feed */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-300">Alertas Recentes</h2>
            <span className="text-xs text-zinc-500">Atualização automática</span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(!recent || recent.length === 0) && (
              <div className="text-center text-zinc-600 py-8 text-sm">Nenhum alerta registrado</div>
            )}
            {(recent || []).map(a => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                  a.severity === 'CRITICAL' ? 'bg-red-500' :
                  a.severity === 'HIGH'     ? 'bg-orange-500' :
                  a.severity === 'MEDIUM'   ? 'bg-yellow-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-zinc-200 truncate">{a.employee_name || 'Não identificado'}</span>
                    <SeverityBadge severity={a.severity} />
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-zinc-400">{a.plate || '—'}</span>
                    <span>•</span>
                    <span className="text-orange-400 font-semibold">{a.recorded_speed} km/h</span>
                    <span className="text-zinc-600">(limite {a.speed_limit})</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><MapPin size={10} />{a.city || '—'}</span>
                  </div>
                </div>
                <div className="text-xs text-zinc-600 shrink-0">{fmtRelative(a.occurred_at)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top offenders */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Award size={14} className="text-yellow-400" />
            <h2 className="text-sm font-semibold text-zinc-300">Top 5 Infratores (30 dias)</h2>
          </div>
          <div className="space-y-3">
            {(!topEmp || topEmp.length === 0) && (
              <div className="text-center text-zinc-600 py-6 text-sm">Sem dados</div>
            )}
            {(topEmp || []).map((e, i) => (
              <div key={e.id} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0 ? 'bg-red-900 text-red-300' :
                  i === 1 ? 'bg-orange-900 text-orange-300' :
                  i === 2 ? 'bg-yellow-900 text-yellow-300' :
                  'bg-zinc-800 text-zinc-400'
                }`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-200 truncate">{e.name}</div>
                  <div className="text-xs text-zinc-500">{e.base_name || '—'}</div>
                </div>
                <div className="text-sm font-bold text-red-400">{e.total_alerts}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
