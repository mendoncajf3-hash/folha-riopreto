import { describe, expect, it } from "vitest";
import { ACTIONS, DEFAULT_ROLE_PERMISSIONS, MODULES, ROLES, permissionKey } from "@portal/shared";

/** Réplica da regra de autorização usada no middleware (module:action ou module:manage). */
function granted(permissions: string[], module: string, action: string): boolean {
  return permissions.includes(`${module}:${action}`) || permissions.includes(`${module}:manage`);
}

describe("RBAC — permissões por perfil", () => {
  it("ADMIN gerencia todos os módulos", () => {
    const perms = DEFAULT_ROLE_PERMISSIONS[ROLES.ADMIN];
    for (const module of Object.values(MODULES)) {
      expect(granted(perms, module, ACTIONS.DELETE)).toBe(true);
    }
  });

  it("OPERADOR lê Escalas mas não cria", () => {
    const perms = DEFAULT_ROLE_PERMISSIONS[ROLES.OPERADOR];
    expect(granted(perms, MODULES.ESCALAS, ACTIONS.READ)).toBe(true);
    expect(granted(perms, MODULES.ESCALAS, ACTIONS.CREATE)).toBe(false);
  });

  it("GESTOR gerencia Escalas", () => {
    const perms = DEFAULT_ROLE_PERMISSIONS[ROLES.GESTOR];
    expect(granted(perms, MODULES.ESCALAS, ACTIONS.CREATE)).toBe(true);
    expect(granted(perms, MODULES.ESCALAS, ACTIONS.UPDATE)).toBe(true);
  });

  it("OPERADOR não acessa Administração", () => {
    const perms = DEFAULT_ROLE_PERMISSIONS[ROLES.OPERADOR];
    expect(granted(perms, MODULES.ADMIN, ACTIONS.READ)).toBe(false);
  });

  it("permissionKey monta a chave no formato esperado", () => {
    expect(permissionKey(MODULES.ESCALAS, ACTIONS.UPDATE)).toBe("escalas:update");
  });
});
