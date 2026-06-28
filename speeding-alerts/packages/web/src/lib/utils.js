import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const fmtDate = (d) =>
  d ? format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }) : '—';

export const fmtDateTime = (d) =>
  d ? format(parseISO(d), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '—';

export const fmtRelative = (d) =>
  d ? formatDistanceToNow(parseISO(d), { locale: ptBR, addSuffix: true }) : '—';

export const fmtPhone = (p) => {
  if (!p) return '—';
  const n = p.replace(/\D/g, '');
  if (n.length === 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;
  return p;
};

export const severityLabel = (s) => ({
  LOW:      'Baixo',
  MEDIUM:   'Médio',
  HIGH:     'Alto',
  CRITICAL: 'Crítico',
}[s] || s || '—');

export const statusLabel = (s) => ({
  PENDING:      'Pendente',
  NOTIFIED:     'Notificado',
  ACKNOWLEDGED: 'Ciente',
  ESCALATED:    'Escalado',
}[s] || s || '—');

export const statusEmployeeLabel = (s) => ({
  ACTIVE:     'Ativo',
  INACTIVE:   'Inativo',
  TERMINATED: 'Desligado',
}[s] || s || '—');

export const clsx = (...args) => args.filter(Boolean).join(' ');
