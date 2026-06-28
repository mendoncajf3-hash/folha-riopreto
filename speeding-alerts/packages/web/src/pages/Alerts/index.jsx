import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, MapPin, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../lib/api';
import SeverityBadge from '../../components/SeverityBadge';
import { fmtDateTime } from '../../lib/utils';

const fetchAlerts = (params) =>
  api.get('/alerts', { params }).then(r => r.data);

const statusColors = {
  PENDING:      'text-zinc-400',
  NOTIFIED:     'text-blue-400',
  ACKNOWLEDGED: 'text-green-400',
  ESCALATED:    'text-red-400',
};

const statusLabels = {
  PENDING:      'Pendente',
  NOTIFIED:     'Notificado',
  ACKNOWLEDGED: 'Ciente',
  ESCALATED:    'Escalado',
};

export default function AlertsPage() {
  const [page, setPage]   = useState(1);
  const [filters, setFilters] = useState({
    employee_name: '', plate: '', date_from: '', date_to: ''
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['alerts', page, filters],
    queryFn: () => fetchAlerts({ page, limit: 50, ...filters }),
    keepPreviousData: true,
  });

  const rows  = data?.data || [];
  const total = data?.pagination?.total || 0;
  const pages = data?.pagination?.pages || 1;

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const clearFilters = () => {
    setFilters({ employee_name: '', plate: '', date_from: '', date_to: '' });
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Alertas de Velocidade</h1>
        <p className="text-sm text-zinc-500">{total} registros encontrados</p>
      </div>

      {/* Filtros */}
      <form onSubmit={handleFilter} className="card flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-40">
          <label className="block text-xs text-zinc-500 mb-1">Funcionário</label>
          <input className="input" placeholder="Nome do funcionário..."
            value={filters.employee_name}
            onChange={e => setFilters(f => ({ ...f, employee_name: e.target.value }))} />
        </div>
        <div className="w-36">
          <label className="block text-xs text-zinc-500 mb-1">Placa</label>
          <input className="input" placeholder="ABC1234"
            value={filters.plate}
            onChange={e => setFilters(f => ({ ...f, plate: e.target.value }))} />
        </div>
        <div className="w-40">
          <label className="block text-xs text-zinc-500 mb-1">Data início</label>
          <input className="input" type="date"
            value={filters.date_from}
            onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
        </div>
        <div className="w-40">
          <label className="block text-xs text-zinc-500 mb-1">Data fim</label>
          <input className="input" type="date"
            value={filters.date_to}
            onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
        </div>
        <button type="submit" className="btn-primary flex items-center gap-2">
          <Search size={14} /> Buscar
        </button>
        <button type="button" onClick={clearFilters} className="btn-secondary flex items-center gap-2">
          <Filter size={14} /> Limpar
        </button>
      </form>

      {/* Tabela */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Data / Hora</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Funcionário</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Veículo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Velocidade</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Limite</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Excesso</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cidade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Gravidade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ocorrência</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={11} className="text-center py-12 text-zinc-500">Carregando...</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={11} className="text-center py-12 text-zinc-600">Nenhum alerta encontrado</td></tr>
              )}
              {rows.map((a) => (
                <tr key={a.id} className="table-row">
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs whitespace-nowrap">
                    {fmtDateTime(a.occurred_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-200 truncate max-w-44">{a.employee_name || <span className="text-zinc-600">—</span>}</div>
                    <div className="text-xs text-zinc-500">{a.registration} · {a.base_name || '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-zinc-300">{a.plate || '—'}</span>
                    {a.vehicle_model && <div className="text-xs text-zinc-500">{a.vehicle_model}</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-orange-400">{a.recorded_speed} <span className="text-xs font-normal text-zinc-500">km/h</span></td>
                  <td className="px-4 py-3 text-right text-zinc-400">{a.speed_limit}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-400">+{a.excess_speed}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs max-w-32 truncate">
                    <div className="flex items-center gap-1"><MapPin size={10} className="shrink-0" />{a.city || '—'}</div>
                  </td>
                  <td className="px-4 py-3"><SeverityBadge severity={a.severity} /></td>
                  <td className="px-4 py-3 text-center">
                    {a.occurrence_number ? (
                      <span className="font-mono text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300">{a.occurrence_number}ª</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${statusColors[a.infraction_status] || 'text-zinc-500'}`}>
                      {statusLabels[a.infraction_status] || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.map_link && (
                      <a href={a.map_link} target="_blank" rel="noopener noreferrer"
                        className="text-zinc-500 hover:text-blue-400 transition-colors">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <span className="text-xs text-zinc-500">Página {page} de {pages} · {total} registros</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-ghost py-1 disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="btn-ghost py-1 disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
