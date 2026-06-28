import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit2, Phone, X, Check } from 'lucide-react';
import api from '../../lib/api';
import { fmtDate, fmtPhone, statusEmployeeLabel } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

const statusColors = {
  ACTIVE:     'text-green-400',
  INACTIVE:   'text-yellow-400',
  TERMINATED: 'text-zinc-500',
};

function EmployeeModal({ employee, bases, onClose, onSave }) {
  const [form, setForm] = useState({
    registration: employee?.registration || '',
    name:         employee?.name || '',
    role:         employee?.role || '',
    base_id:      employee?.base_id || '',
    phone:        employee?.phone || '',
    whatsapp:     employee?.whatsapp || '',
    cost_center:  employee?.cost_center || '',
    hired_at:     employee?.hired_at?.slice(0,10) || '',
    status:       employee?.status || 'ACTIVE',
    notes:        employee?.notes || '',
  });
  const [err, setErr] = useState('');

  const handle = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await onSave(form);
      onClose();
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Erro ao salvar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="font-semibold text-zinc-100">{employee ? 'Editar Funcionário' : 'Novo Funcionário'}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Matrícula *</label>
              <input className="input" value={form.registration} onChange={handle('registration')}
                required disabled={!!employee} placeholder="00000" />
            </div>
            <div className="col-span-1">
              <label className="block text-xs text-zinc-500 mb-1">Cargo / Função</label>
              <input className="input" value={form.role} onChange={handle('role')} placeholder="Motorista" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Nome Completo *</label>
            <input className="input" value={form.name} onChange={handle('name')} required placeholder="NOME EM MAIÚSCULAS" />
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
              <label className="block text-xs text-zinc-500 mb-1">C. Custo</label>
              <input className="input" value={form.cost_center} onChange={handle('cost_center')} placeholder="74" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Telefone</label>
              <input className="input" value={form.phone} onChange={handle('phone')} placeholder="(17) 99999-0000" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">WhatsApp</label>
              <input className="input" value={form.whatsapp} onChange={handle('whatsapp')} placeholder="(17) 99999-0000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Admissão</label>
              <input className="input" type="date" value={form.hired_at} onChange={handle('hired_at')} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Situação</label>
              <select className="select" value={form.status} onChange={handle('status')}>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
                <option value="TERMINATED">Desligado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Observações</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={handle('notes')} />
          </div>
          {err && <p className="text-red-400 text-xs">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary flex items-center gap-1.5"><Check size={14} /> Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = ['SUPERADMIN', 'ADMIN'].includes(user?.role);

  const [search, setSearch]   = useState('');
  const [modal, setModal]     = useState(null); // null | 'new' | employee object
  const [page, setPage]       = useState(1);

  const { data: basesData } = useQuery({
    queryKey: ['bases'],
    queryFn: () => api.get('/bases').then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, search],
    queryFn: () => api.get('/employees', { params: { search, page, limit: 50 } }).then(r => r.data),
    keepPreviousData: true,
  });

  const saveMutation = useMutation({
    mutationFn: (form) => modal === 'new'
      ? api.post('/employees', form)
      : api.put(`/employees/${modal.id}`, form),
    onSuccess: () => { qc.invalidateQueries(['employees']); },
  });

  const rows  = data?.data || [];
  const total = data?.pagination?.total || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Funcionários</h1>
          <p className="text-sm text-zinc-500">{total} cadastrados</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2">
            <Plus size={14} /> Novo Funcionário
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card flex items-center gap-3">
        <Search size={16} className="text-zinc-500 shrink-0" />
        <input className="bg-transparent flex-1 text-sm outline-none text-zinc-200 placeholder:text-zinc-600"
          placeholder="Buscar por nome ou matrícula..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Mat.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Base</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cargo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">WhatsApp</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Alertas/30d</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Situação</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="text-center py-12 text-zinc-500">Carregando...</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-zinc-600">Nenhum funcionário encontrado</td></tr>
              )}
              {rows.map(e => (
                <tr key={e.id} className="table-row">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{e.registration}</td>
                  <td className="px-4 py-3 font-medium text-zinc-200">{e.name}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{e.base_name || '—'}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{e.role || '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {e.whatsapp
                      ? <span className="flex items-center gap-1 text-green-400"><Phone size={10} />{fmtPhone(e.whatsapp)}</span>
                      : <span className="text-zinc-600">Não cadastrado</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${parseInt(e.alerts_30d) > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                      {e.alerts_30d || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${statusColors[e.status] || 'text-zinc-500'}`}>
                      {statusEmployeeLabel(e.status)}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <button onClick={() => setModal(e)} className="btn-ghost py-1 px-2">
                        <Edit2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.pagination?.pages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-zinc-800">
            <span className="text-xs text-zinc-500">Página {page} de {data.pagination.pages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1 px-3 disabled:opacity-40">‹</button>
              <button onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))} disabled={page === data.pagination.pages} className="btn-secondary py-1 px-3 disabled:opacity-40">›</button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <EmployeeModal
          employee={modal === 'new' ? null : modal}
          bases={basesData}
          onClose={() => setModal(null)}
          onSave={(form) => saveMutation.mutateAsync(form)}
        />
      )}
    </div>
  );
}
