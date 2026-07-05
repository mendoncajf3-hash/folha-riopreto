import { Router } from "express";
import { z } from "zod";
import { ACTIONS, MODULES } from "@portal/shared";
import { handler, ok } from "../../core/http/respond.js";
import { parse } from "../../core/http/validate.js";
import { requireAuth } from "../../core/middleware/auth.js";
import { requirePermission } from "../../core/middleware/rbac.js";
import { audit } from "../../core/services/audit.js";
import * as service from "./admin.service.js";

export const adminRouter = Router();
adminRouter.use(requireAuth);

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
  baseId: z.string().uuid().nullable().optional(),
  roles: z.array(z.string()).min(1, "Informe ao menos um perfil"),
});

adminRouter.get(
  "/users",
  requirePermission(MODULES.ADMIN, ACTIONS.READ),
  handler(async (_req, res) => ok(res, await service.listUsers())),
);

adminRouter.post(
  "/users",
  requirePermission(MODULES.ADMIN, ACTIONS.CREATE),
  handler(async (req, res) => {
    const input = parse(createUserSchema, req.body);
    const user = await service.createUser(input);
    await audit({ userId: req.user!.id, module: MODULES.ADMIN, entity: "user", entityId: user.id, action: "create", ip: req.ip });
    ok(res, user, 201);
  }),
);

adminRouter.patch(
  "/users/:id/active",
  requirePermission(MODULES.ADMIN, ACTIONS.UPDATE),
  handler(async (req, res) => {
    const { active } = parse(z.object({ active: z.boolean() }), req.body);
    await service.setUserActive(req.params.id, active);
    await audit({ userId: req.user!.id, module: MODULES.ADMIN, entity: "user", entityId: req.params.id, action: active ? "activate" : "deactivate", ip: req.ip });
    ok(res, { updated: true });
  }),
);

adminRouter.get(
  "/roles",
  requirePermission(MODULES.ADMIN, ACTIONS.READ),
  handler(async (_req, res) => ok(res, await service.listRoles())),
);

adminRouter.get(
  "/bases",
  requireAuth,
  handler(async (_req, res) => ok(res, await service.listBases())),
);

adminRouter.post(
  "/bases",
  requirePermission(MODULES.ADMIN, ACTIONS.CREATE),
  handler(async (req, res) => {
    const input = parse(z.object({ name: z.string().min(2), code: z.string().min(2) }), req.body);
    const base = await service.createBase(input);
    await audit({ userId: req.user!.id, module: MODULES.ADMIN, entity: "base", entityId: base.id, action: "create", ip: req.ip });
    ok(res, base, 201);
  }),
);

adminRouter.get(
  "/audit",
  requirePermission(MODULES.ADMIN, ACTIONS.READ),
  handler(async (req, res) => {
    const limit = Number(req.query.limit ?? 100);
    ok(res, await service.listAuditLogs(limit));
  }),
);
