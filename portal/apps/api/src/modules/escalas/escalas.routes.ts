import { Router } from "express";
import { z } from "zod";
import { ACTIONS, MODULES } from "@portal/shared";
import { handler, ok } from "../../core/http/respond.js";
import { parse } from "../../core/http/validate.js";
import { requireAuth } from "../../core/middleware/auth.js";
import { requirePermission } from "../../core/middleware/rbac.js";
import { audit } from "../../core/services/audit.js";
import * as service from "./escalas.service.js";

export const escalasRouter = Router();
escalasRouter.use(requireAuth);

const PERIODS = ["MANHA", "TARDE", "NOITE", "INTEGRAL"] as const;
const STATUSES = ["PLANEJADA", "CONFIRMADA", "AUSENTE", "SUBSTITUIDA"] as const;

// ── Equipes ──
escalasRouter.get(
  "/teams",
  requirePermission(MODULES.ESCALAS, ACTIONS.READ),
  handler(async (req, res) => ok(res, await service.listTeams(req.query.baseId as string | undefined))),
);

escalasRouter.post(
  "/teams",
  requirePermission(MODULES.ESCALAS, ACTIONS.CREATE),
  handler(async (req, res) => {
    const input = parse(
      z.object({
        name: z.string().min(2),
        baseId: z.string().uuid(),
        memberIds: z.array(z.string().uuid()).optional(),
      }),
      req.body,
    );
    const team = await service.createTeam(input);
    await audit({ userId: req.user!.id, module: MODULES.ESCALAS, entity: "team", entityId: team.id, action: "create", ip: req.ip });
    ok(res, team, 201);
  }),
);

// ── Turnos ──
escalasRouter.get(
  "/shifts",
  requirePermission(MODULES.ESCALAS, ACTIONS.READ),
  handler(async (req, res) => {
    ok(
      res,
      await service.listShifts({
        baseId: req.query.baseId as string | undefined,
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
      }),
    );
  }),
);

escalasRouter.post(
  "/shifts",
  requirePermission(MODULES.ESCALAS, ACTIONS.CREATE),
  handler(async (req, res) => {
    const input = parse(
      z.object({
        baseId: z.string().uuid(),
        userId: z.string().uuid(),
        teamId: z.string().uuid().nullable().optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD"),
        period: z.enum(PERIODS).default("INTEGRAL"),
        note: z.string().optional(),
      }),
      req.body,
    );
    const shift = await service.createShift(input);
    await audit({ userId: req.user!.id, module: MODULES.ESCALAS, entity: "shift", entityId: shift.id, action: "create", ip: req.ip });
    ok(res, shift, 201);
  }),
);

escalasRouter.patch(
  "/shifts/:id/status",
  requirePermission(MODULES.ESCALAS, ACTIONS.UPDATE),
  handler(async (req, res) => {
    const { status } = parse(z.object({ status: z.enum(STATUSES) }), req.body);
    const shift = await service.updateShiftStatus(req.params.id, status);
    await audit({ userId: req.user!.id, module: MODULES.ESCALAS, entity: "shift", entityId: req.params.id, action: "status", diff: { status }, ip: req.ip });
    ok(res, shift);
  }),
);

escalasRouter.post(
  "/shifts/:id/substitute",
  requirePermission(MODULES.ESCALAS, ACTIONS.UPDATE),
  handler(async (req, res) => {
    const { substituteId, reason } = parse(
      z.object({ substituteId: z.string().uuid(), reason: z.string().optional() }),
      req.body,
    );
    const shift = await service.substituteShift(req.params.id, substituteId, reason);
    await audit({ userId: req.user!.id, module: MODULES.ESCALAS, entity: "shift", entityId: req.params.id, action: "substitute", ip: req.ip });
    ok(res, shift);
  }),
);

// ── Férias ──
escalasRouter.get(
  "/vacations",
  requirePermission(MODULES.ESCALAS, ACTIONS.READ),
  handler(async (req, res) => ok(res, await service.listVacations(req.query.userId as string | undefined))),
);

escalasRouter.post(
  "/vacations",
  requirePermission(MODULES.ESCALAS, ACTIONS.CREATE),
  handler(async (req, res) => {
    const input = parse(
      z.object({
        userId: z.string().uuid(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        note: z.string().optional(),
      }),
      req.body,
    );
    const vacation = await service.createVacation(input);
    await audit({ userId: req.user!.id, module: MODULES.ESCALAS, entity: "vacation", entityId: vacation.id, action: "create", ip: req.ip });
    ok(res, vacation, 201);
  }),
);
