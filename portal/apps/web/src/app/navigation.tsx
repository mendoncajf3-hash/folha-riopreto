import { MODULES } from "@portal/shared";

export interface NavItem {
  to: string;
  label: string;
  /** Glyph curto (mono) usado como marcador quando a sidebar está recolhida. */
  glyph: string;
  /** Permissão mínima para exibir o item (formato "<module>:read"). */
  permission: string;
  /** Módulos ainda não implementados aparecem como "em breve". */
  soon?: boolean;
}

export const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", glyph: "◫", permission: `${MODULES.DASHBOARD}:read` },
  { to: "/escalas", label: "Escalas", glyph: "◷", permission: `${MODULES.ESCALAS}:read` },
  { to: "/tarefas", label: "Gestão de Tarefas", glyph: "✓", permission: `${MODULES.TASKS}:read`, soon: true },
  { to: "/leitura", label: "Planejamento de Leitura", glyph: "⇄", permission: `${MODULES.LEITURA}:read`, soon: true },
  { to: "/diario", label: "Diário de Bordo", glyph: "❏", permission: `${MODULES.DIARIO}:read`, soon: true },
  { to: "/indicadores", label: "Indicadores", glyph: "◔", permission: `${MODULES.INDICADORES}:read`, soon: true },
  { to: "/documentos", label: "Documentos", glyph: "▤", permission: `${MODULES.DOCUMENTOS}:read`, soon: true },
  { to: "/integracoes", label: "Integrações", glyph: "⧉", permission: `${MODULES.INTEGRACOES}:read`, soon: true },
  { to: "/admin", label: "Administração", glyph: "⚙", permission: `${MODULES.ADMIN}:read` },
];
