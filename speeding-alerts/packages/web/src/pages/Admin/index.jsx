import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, MessageSquare, Settings, Upload, Check, X } from 'lucide-react';
import api from '../../lib/api';

const tabs = [
  { id: 'users',     icon: Users,         label: 'Usuários' },
  { id: 'templates', icon: MessageSquare, label: 'Mensagens WhatsApp' },
  { id: 'config',    icon: Settings,      label: 'Configurações' },
  { id: 'import',    icon: Upload,        label: 'Importar Dados' },
];

// ── USUÁRIOS ──────────────────────────────────────────────────────
function UsersTab() {
  const qc = useQueryClient();
  const { data: users } = useQuery({ queryKey: ['admin-users'], queryFn: () => api.get('/admin/users').then(r => r.data) });
  const [modal, setModal] = useState(null);
  const [form, setForm]   = useState({ username: '', password: '', name: '', role: 'VIEWER' });
  const [err, setErr]     = useState('');

  const save = useMutation({
    mutationFn: (f) => modal === 'new'
      ? api.post('/admin/users', f)
      : api.put(`/admin/users/${modal.id}`, f),
    onSuccess: () => { qc.invalidateQueries(['admin-users']); setModal(null); },
    onError:   (e) => setErr(e.response?.data?.error || 'Erro'),
  });

  const roleColors = { SUPERADMIN: 'text-red-400', ADMIN: 'text-orange-400', MANAGER: 'text-blue-400', VIEWER: 'text-zinc-400' };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-zinc-200">Usuários do Sistema</h2>
        <button onClick={() => { setForm({ username:'',password:'',name:'',role:'VIEWER' }); setErr(''); setModal('new'); }}
          className="btn-primary flex items-center gap-1.5 text-sm">
          <Users size={13} /> Novo Usuário
        </button>
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-800/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Login</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Perfil</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(users || []).map(u => (
              <tr key={u.id} className="table-row">
                <td className="px-4 py-3 font-mono text-zinc-300">{u.username}</td>
                <td className="px-4 py-3 text-zinc-200">{u.name}</td>
                <td className="px-4 py-3"><span className={`text-xs font-semibold ${roleColors[u.role]}`}>{u.role}</span></td>
                <td className="px-4 py-3"><span className={`text-xs ${u.active ? 'text-green-400' : 'text-zinc-600'}`}>{u.active ? 'Ativo' : 'Inativo'}</span></td>
                <td className="px-4 py-3">
                  <button onClick={() => { setForm({ name: u.name, role: u.role, active: u.active, password: '' }); setErr(''); setModal(u); }}
                    className="btn-ghost py-1 px-2 text-xs">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-zinc-100">{modal === 'new' ? 'Novo Usuário' : 'Editar Usuário'}</h3>
              <button onClick={() => setModal(null)} className="text-zinc-500"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              {modal === 'new' && (
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Login *</label>
                  <input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="usuario.login" />
                </div>
              )}
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Nome *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Senha {modal !== 'new' && '(deixe em branco para não alterar)'}</label>
                <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Perfil</label>
                <select className="select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="VIEWER">Visualizador</option>
                  <option value="MANAGER">Gestor</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="SUPERADMIN">Super Admin</option>
                </select>
              </div>
              {modal !== 'new' && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="u-active" checked={form.active !== false}
                    onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="accent-red-500" />
                  <label htmlFor="u-active" className="text-sm text-zinc-300">Usuário ativo</label>
                </div>
              )}
              {err && <p className="text-red-400 text-xs">{err}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
                <button onClick={() => save.mutate(form)} className="btn-primary flex items-center gap-1.5"><Check size={13} />Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TEMPLATES ──────────────────────────────────────────────────────
function TemplatesTab() {
  const qc = useQueryClient();
  const { data: templates } = useQuery({
    queryKey: ['admin-templates'],
    queryFn: () => api.get('/admin/templates').then(r => r.data),
  });
  const [editing, setEditing] = useState(null);
  const [text, setText]       = useState('');

  const save = useMutation({
    mutationFn: ({ id, template_text }) => api.put(`/admin/templates/${id}`, { template_text }),
    onSuccess: () => { qc.invalidateQueries(['admin-templates']); setEditing(null); },
  });

  const occurrenceLabel = (n) => n >= 5 ? `${n}ª ou mais` : `${n}ª ocorrência`;
  const toneColors = { 'amigável':'text-green-400', 'firme':'text-yellow-400', 'advertência':'text-orange-400', 'escalada':'text-red-400', 'crítico':'text-red-500' };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-zinc-200">Templates de Mensagem WhatsApp</h2>
        <p className="text-xs text-zinc-500 mt-1">
          Variáveis disponíveis: {'{nome}'} {'{placa}'} {'{data}'} {'{hora}'} {'{velocidade}'} {'{limite}'} {'{ocorrencia}'}
        </p>
      </div>
      <div className="space-y-3">
        {(templates || []).map(t => (
          <div key={t.id} className="card">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-sm font-semibold text-zinc-200">{occurrenceLabel(t.occurrence_number)}</span>
                <span className={`ml-2 text-xs font-medium ${toneColors[t.tone] || 'text-zinc-400'}`}>· {t.tone}</span>
                {t.use_ai && <span className="ml-2 text-xs text-purple-400 border border-purple-700/40 rounded px-1">IA</span>}
              </div>
              <button onClick={() => { setEditing(t.id); setText(t.template_text); }} className="btn-ghost py-1 px-2 text-xs shrink-0">Editar</button>
            </div>
            {editing === t.id ? (
              <div className="space-y-2">
                <textarea className="input resize-none w-full" rows={4} value={text} onChange={e => setText(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={() => save.mutate({ id: t.id, template_text: text })} className="btn-primary text-xs py-1 flex items-center gap-1"><Check size={12} />Salvar</button>
                  <button onClick={() => setEditing(null)} className="btn-secondary text-xs py-1">Cancelar</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400 leading-relaxed">{t.template_text}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CONFIGURAÇÕES ─────────────────────────────────────────────────
function ConfigTab() {
  const qc = useQueryClient();
  const { data: configs } = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => api.get('/admin/config').then(r => r.data),
  });
  const [edits, setEdits] = useState({});
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () => api.put('/admin/config', edits),
    onSuccess: () => { qc.invalidateQueries(['admin-config']); setEdits({}); setSaved(true); setTimeout(() => setSaved(false), 2000); },
  });

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-zinc-200">Configurações do Sistema</h2>
      <div className="card space-y-4">
        {(configs || []).map(c => (
          <div key={c.key} className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs text-zinc-500 mb-1">{c.label || c.key}</label>
              <input className="input"
                defaultValue={c.value}
                onChange={e => setEdits(ed => ({ ...ed, [c.key]: e.target.value }))} />
            </div>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <button onClick={() => save.mutate()} className="btn-primary flex items-center gap-1.5">
            <Check size={13} />{saved ? 'Salvo!' : 'Salvar Configurações'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── IMPORTAÇÃO ────────────────────────────────────────────────────
function ImportTab() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const runImport = async () => {
    setLoading(true); setErr(''); setResult(null);
    try {
      const { data } = await api.post('/admin/import/legacy');
      setResult(data);
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Erro na importação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-zinc-200">Importar Dados do Sistema Legado</h2>
      <div className="card space-y-4">
        <p className="text-sm text-zinc-400">
          Importa funcionários e usuários do sistema anterior (db.json do servidor legado).
          Funcionários já existentes são atualizados. Usuários importados recebem senha temporária: <code className="text-yellow-400 bg-zinc-800 px-1 rounded">Mudar@2024</code>
        </p>
        <button onClick={runImport} disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-50">
          <Upload size={14} />{loading ? 'Importando...' : 'Executar Importação'}
        </button>
        {err && <div className="text-red-400 text-sm">{err}</div>}
        {result && (
          <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-green-400 font-semibold"><Check size={14} />Importação concluída</div>
            <div className="text-sm text-zinc-300">Funcionários importados: <strong>{result.imported?.employees}</strong></div>
            <div className="text-sm text-zinc-300">Usuários importados: <strong>{result.imported?.users}</strong></div>
            <div className="text-sm text-zinc-300">Registros ignorados: <strong>{result.skipped?.employees}</strong></div>
            {result.note && <div className="text-xs text-yellow-400 mt-2">{result.note}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users');
  const Tab = { users: UsersTab, templates: TemplatesTab, config: ConfigTab, import: ImportTab }[activeTab];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Administração</h1>
        <p className="text-sm text-zinc-500">Configurações e gestão do sistema</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.id
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700'
            }`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      <Tab />
    </div>
  );
}
