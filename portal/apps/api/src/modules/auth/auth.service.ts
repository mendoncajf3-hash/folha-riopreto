import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { RoleName, UserDTO } from "@portal/shared";
import { prisma } from "../../core/db.js";
import { config } from "../../core/config.js";
import { Errors } from "../../core/errors.js";

const REFRESH_BYTES = 48;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Carrega usuário + roles + permissões achatadas para o token. */
async function loadUserForAuth(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null, active: true },
    include: {
      base: true,
      userRoles: {
        include: {
          role: { include: { rolePermissions: { include: { permission: true } } } },
        },
      },
    },
  });
  if (!user) throw Errors.unauthorized("Usuário inativo ou inexistente");

  const roles = user.userRoles.map((ur) => ur.role.name as RoleName);
  const permissions = Array.from(
    new Set(
      user.userRoles.flatMap((ur) =>
        ur.role.rolePermissions.map((rp) => rp.permission.key),
      ),
    ),
  );
  return { user, roles, permissions };
}

export function toUserDTO(
  user: { id: string; name: string; email: string; active: boolean; baseId: string | null; createdAt: Date; base?: { name: string } | null },
  roles: RoleName[],
  permissions: string[],
): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    active: user.active,
    baseId: user.baseId,
    baseName: user.base?.name ?? null,
    roles,
    permissions,
    createdAt: user.createdAt.toISOString(),
  };
}

function signAccessToken(user: { id: string; email: string; baseId: string | null }, roles: string[], permissions: string[]): string {
  return jwt.sign(
    { id: user.id, email: user.email, roles, permissions, baseId: user.baseId },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessTtl as jwt.SignOptions["expiresIn"] },
  );
}

export async function login(
  email: string,
  password: string,
  meta: { ip?: string; userAgent?: string },
): Promise<{ user: UserDTO; accessToken: string; refreshToken: string }> {
  const found = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  // Compara sempre (mesmo sem usuário) para não vazar existência por tempo.
  const valid = found
    ? await bcrypt.compare(password, found.passwordHash)
    : await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinva");
  if (!found || !valid || !found.active) {
    throw Errors.unauthorized("E-mail ou senha inválidos");
  }

  const { user, roles, permissions } = await loadUserForAuth(found.id);
  const accessToken = signAccessToken(user, roles, permissions);
  const refreshToken = crypto.randomBytes(REFRESH_BYTES).toString("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshTtlDays);
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      ip: meta.ip,
      userAgent: meta.userAgent,
      expiresAt,
    },
  });

  return { user: toUserDTO(user, roles, permissions), accessToken, refreshToken };
}

/** Rotaciona o refresh token: valida, revoga o antigo e emite um novo par. */
export async function refresh(
  refreshToken: string,
  meta: { ip?: string; userAgent?: string },
): Promise<{ user: UserDTO; accessToken: string; refreshToken: string }> {
  if (!refreshToken) throw Errors.unauthorized("Sessão ausente");
  const session = await prisma.session.findFirst({
    where: { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
  });
  if (!session || session.expiresAt < new Date()) {
    throw Errors.unauthorized("Sessão expirada");
  }

  const { user, roles, permissions } = await loadUserForAuth(session.userId);
  const newRefresh = crypto.randomBytes(REFRESH_BYTES).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshTtlDays);

  await prisma.$transaction([
    prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } }),
    prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashToken(newRefresh),
        ip: meta.ip,
        userAgent: meta.userAgent,
        expiresAt,
      },
    }),
  ]);

  const accessToken = signAccessToken(user, roles, permissions);
  return { user: toUserDTO(user, roles, permissions), accessToken, refreshToken: newRefresh };
}

export async function logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  await prisma.session.updateMany({
    where: { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function currentUser(userId: string): Promise<UserDTO> {
  const { user, roles, permissions } = await loadUserForAuth(userId);
  return toUserDTO(user, roles, permissions);
}
