import type { ShiftDTO, TeamDTO } from "@portal/shared";
import { prisma } from "../../core/db.js";
import { Errors } from "../../core/errors.js";
import { bus } from "../../core/events/bus.js";

// ── Equipes ───────────────────────────────────────────────────────────
export async function listTeams(baseId?: string): Promise<TeamDTO[]> {
  const teams = await prisma.team.findMany({
    where: { deletedAt: null, ...(baseId ? { baseId } : {}) },
    orderBy: { name: "asc" },
    include: { base: true, _count: { select: { members: true } } },
  });
  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    baseId: t.baseId,
    baseName: t.base.name,
    memberCount: t._count.members,
    active: t.active,
  }));
}

export async function createTeam(input: { name: string; baseId: string; memberIds?: string[] }): Promise<TeamDTO> {
  const base = await prisma.base.findFirst({ where: { id: input.baseId, deletedAt: null } });
  if (!base) throw Errors.badRequest("Base inválida");

  const team = await prisma.team.create({
    data: {
      name: input.name,
      baseId: input.baseId,
      members: input.memberIds?.length
        ? { create: input.memberIds.map((userId) => ({ userId })) }
        : undefined,
    },
    include: { base: true, _count: { select: { members: true } } },
  });
  return {
    id: team.id,
    name: team.name,
    baseId: team.baseId,
    baseName: team.base.name,
    memberCount: team._count.members,
    active: team.active,
  };
}

// ── Turnos (escala) ───────────────────────────────────────────────────
function toShiftDTO(s: {
  id: string;
  date: Date;
  period: string;
  status: string;
  userId: string;
  teamId: string | null;
  note: string | null;
  user?: { name: string };
  team?: { name: string } | null;
}): ShiftDTO {
  return {
    id: s.id,
    date: s.date.toISOString().slice(0, 10),
    period: s.period as ShiftDTO["period"],
    status: s.status as ShiftDTO["status"],
    userId: s.userId,
    userName: s.user?.name,
    teamId: s.teamId,
    teamName: s.team?.name ?? null,
    note: s.note,
  };
}

export async function listShifts(params: {
  baseId?: string;
  from?: string;
  to?: string;
}): Promise<ShiftDTO[]> {
  const shifts = await prisma.shift.findMany({
    where: {
      deletedAt: null,
      ...(params.baseId ? { baseId: params.baseId } : {}),
      ...(params.from || params.to
        ? {
            date: {
              ...(params.from ? { gte: new Date(params.from) } : {}),
              ...(params.to ? { lte: new Date(params.to) } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ date: "asc" }, { period: "asc" }],
    include: { user: { select: { name: true } }, team: { select: { name: true } } },
  });
  return shifts.map(toShiftDTO);
}

export async function createShift(input: {
  baseId: string;
  userId: string;
  teamId?: string | null;
  date: string;
  period?: string;
  note?: string;
}): Promise<ShiftDTO> {
  const shift = await prisma.shift.create({
    data: {
      baseId: input.baseId,
      userId: input.userId,
      teamId: input.teamId ?? null,
      date: new Date(input.date),
      period: input.period ?? "INTEGRAL",
      note: input.note,
    },
    include: { user: { select: { name: true } }, team: { select: { name: true } } },
  });
  bus.publish("shift.created", {
    shiftId: shift.id,
    userId: shift.userId,
    baseId: shift.baseId,
    date: input.date,
  });
  return toShiftDTO(shift);
}

export async function updateShiftStatus(id: string, status: string): Promise<ShiftDTO> {
  const existing = await prisma.shift.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw Errors.notFound("Turno não encontrado");
  const shift = await prisma.shift.update({
    where: { id },
    data: { status },
    include: { user: { select: { name: true } }, team: { select: { name: true } } },
  });
  bus.publish("shift.updated", { shiftId: id, status });
  return toShiftDTO(shift);
}

export async function substituteShift(
  shiftId: string,
  substituteId: string,
  reason?: string,
): Promise<ShiftDTO> {
  const shift = await prisma.shift.findFirst({ where: { id: shiftId, deletedAt: null } });
  if (!shift) throw Errors.notFound("Turno não encontrado");

  const [, updated] = await prisma.$transaction([
    prisma.substitution.upsert({
      where: { shiftId },
      create: { shiftId, substituteId, reason },
      update: { substituteId, reason },
    }),
    prisma.shift.update({
      where: { id: shiftId },
      data: { status: "SUBSTITUIDA" },
      include: { user: { select: { name: true } }, team: { select: { name: true } } },
    }),
  ]);
  bus.publish("shift.substituted", { shiftId, substituteId });
  return toShiftDTO(updated);
}

// ── Férias ────────────────────────────────────────────────────────────
export async function listVacations(userId?: string) {
  const vacations = await prisma.vacation.findMany({
    where: userId ? { userId } : {},
    orderBy: { startDate: "desc" },
    include: { user: { select: { name: true } } },
  });
  return vacations.map((v) => ({
    id: v.id,
    userId: v.userId,
    userName: v.user.name,
    startDate: v.startDate.toISOString().slice(0, 10),
    endDate: v.endDate.toISOString().slice(0, 10),
    status: v.status,
    note: v.note,
  }));
}

export async function createVacation(input: {
  userId: string;
  startDate: string;
  endDate: string;
  note?: string;
}) {
  if (new Date(input.endDate) < new Date(input.startDate)) {
    throw Errors.badRequest("Data final anterior à inicial");
  }
  const v = await prisma.vacation.create({
    data: {
      userId: input.userId,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      note: input.note,
    },
    include: { user: { select: { name: true } } },
  });
  return {
    id: v.id,
    userId: v.userId,
    userName: v.user.name,
    startDate: v.startDate.toISOString().slice(0, 10),
    endDate: v.endDate.toISOString().slice(0, 10),
    status: v.status,
    note: v.note,
  };
}
