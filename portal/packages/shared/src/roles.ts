/** Perfis de acesso base do sistema (RBAC). */
export const ROLES = {
  ADMIN: "ADMIN",
  GESTOR: "GESTOR",
  OPERADOR: "OPERADOR",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<RoleName, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor / Coordenador",
  OPERADOR: "Operador",
};
