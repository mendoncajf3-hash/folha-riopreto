import type { Request, Response, NextFunction } from "express";
import { ACTIONS, type ActionName, type ModuleId } from "@portal/shared";
import { Errors } from "../errors.js";

/**
 * Exige que o usuário tenha permissão `<module>:<action>` OU `<module>:manage`.
 * Uso: router.post("/", requirePermission(MODULES.ESCALAS, ACTIONS.CREATE), handler)
 */
export function requirePermission(module: ModuleId, action: ActionName) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) throw Errors.unauthorized();

    const wanted = `${module}:${action}`;
    const manage = `${module}:${ACTIONS.MANAGE}`;
    if (user.permissions.includes(wanted) || user.permissions.includes(manage)) {
      next();
      return;
    }
    throw Errors.forbidden();
  };
}
