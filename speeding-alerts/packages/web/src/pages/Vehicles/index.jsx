import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit2, X, Check } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

function VehicleModal({ vehicle, bases, onClose, onSave }) {
  const [form, setForm] = useState({
    plate:      vehicle?.plate || '',
    model:      vehicle?.model || '',
    brand:      vehicle?.brand || '',
    year:       vehicle?.year || '',
    base_id:    vehicle?.base_id || '',
    tracker_id: vehicle?.tracker_id || '',
    active:     vehicle?.active !== false,
  });
  const [err, setErr] = useState('');
  const handle = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { await onSave(form); onClose(); }
    catch (ex) { setErr(ex.response?.data?.error || 'Erro ao salvar'); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="font-semibold text-zinc-100">{vehicle ? 'Editar Veículo' : 'Novo Veículo'}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Placa *</label>
              <input className="input font-mono" value={form.plate} onChange={handle('plate')}
                required disabled={!!vehicle} placeholder="ABC1D23" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Ano</label>
              <input className="input" type="number" value={form.year} onChange={handle('year')} placeholder="2023" min={2000} max={2030} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Marca</label>
              <input className="input" value={form.brand} onChange={handle('brand')} placeholder="Volkswagen" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Modelo</label>
              <input className="input" value={form.model} onChange={handle('model')} placeholder="Constellation" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Base</label>
              <select className="select" value={form.base_id} onChange={handle('base_id')}>
                <option value="">Selecione...</option>
                {(bases || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">ID Rastreador</label>
              <input className="input" value={form.tracker_id} onChange={handle('tracker_id')} placeholder="ID do dispositivo" />
            </div>
          </div>
          {vehicle && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.active}
                onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                className="w-4 h-4 rounded bg-zinc-800 border-zinc-600 accent-red-500" />
              <label htmlFor="active" className="text-sm text-zinc-300">Veículo ativo</label>
            </div>
          )}
          {err && <p className="text-red-400 text-xs">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary flex items-center gap-1.5"><Check size={14} />Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VehiclesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = ['SUPERADMIN', 'ADMIN'].includes(user?.role);
  const [search, setSearch] = useState('');
  const [modal, setModal]   = useState(null);
  const [page, setPage]     = useState(1);

  const { data: basesData } = useQuery({ queryKey: ['bases'], queryFn: () => api.get('/bases').then(r => r.data) });

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', page, search],
    queryFn: () => api.get('/vehicles', { params: { search, page, limit: 50 } }).then(r => r.data),
    keepPreviousData: true,
  });

  const saveMutation = useMutation({
    mutationFn: (form) => modal === 'new'
      ? api.post('/vehicles', form)
      : api.put(`/vehicles/${modal.id}`, form),
    onSuccess: () => qc.invalidateQueries(['vehicles']),
  });

  const rows  = data?.data || [];
  const total = data?.pagination?.total || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Veículos</h1>
          <p className="text-sm text-zinc-500">{total} cadastrados</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2">
            <Plus size={14} /> Novo Veículo
          </button>
        )}
      </div>

      <div className="card flex items-center gap-3">
        <Search size={16} className="text-zinc-500 shrink-0" />
        <input className="bg-transparent flex-1 text-sm outline-none text-zinc-200 placeholder:text-zinc-600"
          placeholder="Buscar por placa, modelo ou marca..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Placa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Veículo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Base</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Rastreador</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Alertas/30d</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="text-center py-12 text-zinc-500">Carregando...</td></tr>}
              {!isLoading && rows.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-zinc-600">Nenhum veículo encontrado</td></tr>}
              {rows.map(v => (
                <tr key={v.id} className="table-row">
                  <td className="px-4 py-3 font-mono font-bold text-zinc-200">{v.plate}</td>
                  <td className="px-4 py-3 text-zinc-300">{[v.brand, v.model, v.year].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{v.base_name || '—'}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs font-mono">{v.tracker_id || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${parseInt(v.alerts_30d) > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                      {v.alerts_30d || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${v.active ? 'text-green-400' : 'text-zinc-600'}`}>
                      {v.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <button onClick={() => setModal(v)} className="btn-ghost py-1 px-2"><Edit2 size={13} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <VehicleModal
          vehicle={modal === 'new' ? null : modal}
          bases={basesData}
          onClose={() => setModal(null)}
          onSave={(form) => saveMutation.mutateAsync(form)}
        />
      )}
    </div>
  );
}
