import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Truck, MapPin } from 'lucide-react';
import api from '../lib/api';
import SeverityBadge from '../components/SeverityBadge';

const periods = [
  { value: '7',  label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
];

export default function RankingsPage() {
  const [period, setPeriod] = useState('30');

  const { data: empRanking }  = useQuery({
    queryKey: ['ranking-emp', period],
    queryFn: () => api.get(`/dashboard/ranking/employees?period=${period}&limit=20`).then(r => r.data),
  });
  const { data: vehRanking }  = useQuery({
    queryKey: ['ranking-veh', period],
    queryFn: () => api.get(`/dashboard/ranking/vehicles?period=${period}&limit=20`).then(r => r.data),
  });
  const { data: baseRanking } = useQuery({
    queryKey: ['ranking-base', period],
    queryFn: () => api.get(`/dashboard/ranking/bases?period=${period}`).then(r => r.data),
  });
  const { data: recurrences } = useQuery({
    queryKey: ['recurrences', period],
    queryFn: () => api.get(`/dashboard/recurrences?period=${period}&min_alerts=2`).then(r => r.data),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Rankings e Reincidências</h1>
          <p className="text-sm text-zinc-500">Análise por período</p>
        </div>
        <div className="flex gap-2">
          {periods.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top funcionários */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={16} className="text-yellow-400" />
            <h2 className="text-sm font-semibold text-zinc-300">Top Infratores</h2>
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-12 text-xs text-zinc-500 pb-2 border-b border-zinc-800 gap-2">
              <span className="col-span-1">#</span>
              <span className="col-span-5">Funcionário</span>
              <span className="col-span-2 text-right">Alertas</span>
              <span className="col-span-2 text-right">Excesso máx.</span>
              <span className="col-span-2 text-right">Gravidade</span>
            </div>
            {(!empRanking || empRanking.length === 0) && (
              <div className="text-center text-zinc-600 py-6 text-sm">Sem dados no período</div>
            )}
            {(empRanking || []).map((e, i) => (
              <div key={e.id} className="grid grid-cols-12 items-center py-2.5 gap-2 border-b border-zinc-800/50 hover:bg-zinc-800/30 rounded">
                <span className={`col-span-1 text-sm font-bold ${
                  i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-400' : i === 2 ? 'text-amber-600' : 'text-zinc-600'
                }`}>{i + 1}</span>
                <div className="col-span-5">
                  <div className="text-sm font-medium text-zinc-200 truncate">{e.name}</div>
                  <div className="text-xs text-zinc-500">{e.base_name || '—'}</div>
                </div>
                <span className="col-span-2 text-right font-bold text-red-400">{e.total_alerts}</span>
                <span className="col-span-2 text-right text-orange-400 text-sm">+{e.max_excess}</span>
                <div className="col-span-2 flex justify-end"><SeverityBadge severity={e.max_severity} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Top veículos */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Truck size={16} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-zinc-300">Top Veículos</h2>
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-12 text-xs text-zinc-500 pb-2 border-b border-zinc-800 gap-2">
              <span className="col-span-1">#</span>
              <span className="col-span-5">Veículo</span>
              <span className="col-span-2 text-right">Alertas</span>
              <span className="col-span-2 text-right">Excesso méd.</span>
              <span className="col-span-2 text-right">Máximo</span>
            </div>
            {(!vehRanking || vehRanking.length === 0) && (
              <div className="text-center text-zinc-600 py-6 text-sm">Sem dados no período</div>
            )}
            {(vehRanking || []).map((v, i) => (
              <div key={v.id} className="grid grid-cols-12 items-center py-2.5 gap-2 border-b border-zinc-800/50 hover:bg-zinc-800/30 rounded">
                <span className={`col-span-1 text-sm font-bold ${i < 3 ? 'text-yellow-400' : 'text-zinc-600'}`}>{i + 1}</span>
                <div className="col-span-5">
                  <div className="font-mono text-sm font-medium text-zinc-200">{v.plate}</div>
                  <div className="text-xs text-zinc-500">{[v.brand, v.model].filter(Boolean).join(' ') || v.base_name || '—'}</div>
                </div>
                <span className="col-span-2 text-right font-bold text-red-400">{v.total_alerts}</span>
                <span className="col-span-2 text-right text-zinc-400 text-sm">+{v.avg_excess}</span>
                <span className="col-span-2 text-right text-orange-400 text-sm">+{v.max_excess}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking por base */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={16} className="text-green-400" />
            <h2 className="text-sm font-semibold text-zinc-300">Por Base</h2>
          </div>
          <div className="space-y-3">
            {(!baseRanking || baseRanking.length === 0) && (
              <div className="text-center text-zinc-600 py-6 text-sm">Sem dados no período</div>
            )}
            {(baseRanking || []).map((b, i) => {
              const max = baseRanking[0]?.total_alerts || 1;
              const pct = Math.round((b.total_alerts / max) * 100);
              return (
                <div key={b.id || i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-300 font-medium">{b.name || 'Sem base'}</span>
                    <span className="text-red-400 font-bold">{b.total_alerts}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-zinc-600 mt-0.5">{b.drivers_count} motoristas · excesso médio +{b.avg_excess} km/h</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reincidentes */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={16} className="text-red-400" />
            <h2 className="text-sm font-semibold text-zinc-300">Reincidentes (≥2 alertas)</h2>
          </div>
          <div className="space-y-1">
            {(!recurrences || recurrences.length === 0) && (
              <div className="text-center text-zinc-600 py-6 text-sm">Nenhum reincidente no período</div>
            )}
            {(recurrences || []).map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-zinc-800/50">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-200 truncate">{r.name}</div>
                  <div className="text-xs text-zinc-500">{r.base_name || '—'} · Mat. {r.registration}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-red-400 text-lg leading-none">{r.total_alerts}×</div>
                  <div className="text-xs text-zinc-500">ocorrências</div>
                </div>
                <SeverityBadge severity={r.max_severity} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
