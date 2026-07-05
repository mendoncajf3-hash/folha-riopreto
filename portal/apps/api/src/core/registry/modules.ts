import type { Router } from "express";
import { authRouter } from "../../modules/auth/auth.routes.js";
import { adminRouter } from "../../modules/admin/admin.routes.js";
import { escalasRouter } from "../../modules/escalas/escalas.routes.js";
import { registerNotificationListeners } from "../../modules/notificacoes/notificacoes.listeners.js";

/**
 * Registro central de módulos. Adicionar um módulo novo = uma linha aqui.
 * Nenhum módulo existente precisa mudar. Cada módulo expõe apenas seu router
 * (HTTP) e/ou seus listeners (event bus).
 */
export interface ModuleDefinition {
  id: string;
  basePath: string;
  router: Router;
}

export const httpModules: ModuleDefinition[] = [
  { id: "auth", basePath: "/auth", router: authRouter },
  { id: "admin", basePath: "/admin", router: adminRouter },
  { id: "escalas", basePath: "/escalas", router: escalasRouter },
];

/** Listeners de event bus dos módulos que reagem a eventos. */
export function registerEventListeners(): void {
  registerNotificationListeners();
}
