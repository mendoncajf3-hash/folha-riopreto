import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { Errors } from "../errors.js";

/** Conteúdo do access token e identidade anexada à requisição. */
export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  baseId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Exige um access token válido. Popula req.user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw Errors.unauthorized();
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as AuthUser & {
      iat: number;
      exp: number;
    };
    req.user = {
      id: payload.id,
      email: payload.email,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      baseId: payload.baseId ?? null,
    };
    next();
  } catch {
    throw Errors.unauthorized("Sessão expirada ou inválida");
  }
}
