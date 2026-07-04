import { MODULES, type ModuleId } from "./modules.js";
import { ROLES, type RoleName } from "./roles.js";

/** Ações padrão que uma permissão pode conceder sobre um módulo. */
export const ACTIONS = {
  READ: "read",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  MANAGE: "manage", // engloba todas as ações do módulo
} as const;

export type ActionName = (typeof ACTIONS)[keyof typeof ACTIONS];

/** Uma permissão é a combinação `<module>:<action>` (ex.: "escalas:update"). */
export type PermissionKey = `${ModuleId}:${ActionName}`;

export function permissionKey(module: ModuleId, action: ActionName): PermissionKey {
  return `${module}:${action}`;
}

/**
 * Mapa de permissões concedidas por perfil na inicialização (seed).
 * ADMIN recebe "manage" em todos os módulos. Os demais são refinados aqui
 * e podem ser ajustados depois pela tela de Administração.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  [ROLES.ADMIN]: Object.values(MODULES).map((m) => permissionKey(m, ACTIONS.MANAGE)),
  [ROLES.GESTOR]: [
    permissionKey(MODULES.DASHBOARD, ACTIONS.READ),
    permissionKey(MODULES.TASKS, ACTIONS.MANAGE),
    permissionKey(MODULES.ESCALAS, ACTIONS.MANAGE),
    permissionKey(MODULES.LEITURA, ACTIONS.MANAGE),
    permissionKey(MODULES.DIARIO, ACTIONS.MANAGE),
    permissionKey(MODULES.INDICADORES, ACTIONS.READ),
    permissionKey(MODULES.DOCUMENTOS, ACTIONS.MANAGE),
    permissionKey(MODULES.NOTIFICACOES, ACTIONS.READ),
  ],
  [ROLES.OPERADOR]: [
    permissionKey(MODULES.DASHBOARD, ACTIONS.READ),
    permissionKey(MODULES.TASKS, ACTIONS.UPDATE),
    permissionKey(MODULES.TASKS, ACTIONS.READ),
    permissionKey(MODULES.ESCALAS, ACTIONS.READ),
    permissionKey(MODULES.LEITURA, ACTIONS.UPDATE),
    permissionKey(MODULES.LEITURA, ACTIONS.READ),
    permissionKey(MODULES.DIARIO, ACTIONS.CREATE),
    permissionKey(MODULES.DIARIO, ACTIONS.READ),
    permissionKey(MODULES.DOCUMENTOS, ACTIONS.READ),
    permissionKey(MODULES.NOTIFICACOES, ACTIONS.READ),
  ],
};
