/** Identificadores canônicos dos módulos. Usados em permissões, menu e auditoria. */
export const MODULES = {
  DASHBOARD: "dashboard",
  TASKS: "tasks",
  ESCALAS: "escalas",
  LEITURA: "leitura",
  DIARIO: "diario",
  INDICADORES: "indicadores",
  DOCUMENTOS: "documentos",
  NOTIFICACOES: "notificacoes",
  ADMIN: "admin",
  INTEGRACOES: "integracoes",
} as const;

export type ModuleId = (typeof MODULES)[keyof typeof MODULES];

export const MODULE_LABELS: Record<ModuleId, string> = {
  dashboard: "Dashboard",
  tasks: "Gestão de Tarefas",
  escalas: "Escalas",
  leitura: "Planejamento de Leitura",
  diario: "Diário de Bordo",
  indicadores: "Indicadores",
  documentos: "Documentos",
  notificacoes: "Notificações",
  admin: "Administração",
  integracoes: "Integrações",
};
