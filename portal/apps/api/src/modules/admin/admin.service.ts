import bcrypt from "bcryptjs";
import type { BaseDTO, RoleName, UserDTO } from "@portal/shared";
import { prisma } from "../../core/db.js";
import { Errors } from "../../core/errors.js";
import { bus } from "../../core/events/bus.js";
import { toUserDTO } from "../auth/auth.service.js";

// ── Usuários ──────────────────────────────────────────────────────────
export async function listUsers(): Promise<UserDTO[]> {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      base: true,
      userRoles: {
        include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
      },
    },
  });
  return users.map((u) =>
    toUserDTO(
      u,
      u.userRoles.map((ur) => ur.role.name as RoleName),
      Array.from(
        new Set(u.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.key))),
      ),
    ),
  );
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  baseId?: string | null;
  roles: string[];
}): Promise<UserDTO> {
  const exists = await prisma.user.findFirst({ where: { email: input.email, deletedAt: null } });
  if (exists) throw Errors.conflict("Já existe um usuário com este e-mail");

  const roles = await prisma.role.findMany({ where: { name: { in: input.roles } } });
  if (roles.length !== input.roles.length) throw Errors.badRequest("Perfil inválido informado");

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      baseId: input.baseId ?? null,
      userRoles: { create: roles.map((r) => ({ roleId: r.id })) },
    },
    include: { base: true },
  });

  bus.publish("user.created", { userId: user.id, email: user.email });
  return toUserDTO(user, input.roles as RoleName[], []);
}

export async function setUserActive(id: string, active: boolean): Promise<void> {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) throw Errors.notFound("Usuário não encontrado");
  await prisma.user.update({ where: { id }, data: { active } });
}

// ── Perfis ────────────────────────────────────────────────────────────
export async function listRoles(): Promise<
  { id: string; name: string; description: string | null; permissions: string[] }[]
> {
  const roles = await prisma.role.findMany({
    include: { rolePermissions: { include: { permission: true } } },
    orderBy: { name: "asc" },
  });
  return roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: r.rolePermissions.map((rp) => rp.permission.key),
  }));
}

// ── Bases ─────────────────────────────────────────────────────────────
export async function listBases(): Promise<BaseDTO[]> {
  const bases = await prisma.base.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
  return bases.map((b) => ({ id: b.id, name: b.name, code: b.code, active: b.active }));
}

export async function createBase(input: { name: string; code: string }): Promise<BaseDTO> {
  const exists = await prisma.base.findFirst({ where: { code: input.code } });
  if (exists) throw Errors.conflict("Já existe uma base com este código");
  const base = await prisma.base.create({ data: { name: input.name, code: input.code } });
  return { id: base.id, name: base.name, code: base.code, active: base.active };
}

// ── Auditoria ─────────────────────────────────────────────────────────
export async function listAuditLogs(limit = 100) {
  const logs = await prisma.auditLog.findMany({
    orderBy: { at: "desc" },
    take: Math.min(limit, 500),
    include: { user: { select: { name: true } } },
  });
  return logs.map((l) => ({
    id: l.id,
    userName: l.user?.name ?? "sistema",
    module: l.module,
    entity: l.entity,
    entityId: l.entityId,
    action: l.action,
    at: l.at.toISOString(),
  }));
}
