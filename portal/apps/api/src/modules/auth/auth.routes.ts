import { Router } from "express";
import { z } from "zod";
import { handler, ok } from "../../core/http/respond.js";
import { parse } from "../../core/http/validate.js";
import { requireAuth } from "../../core/middleware/auth.js";
import { config } from "../../core/config.js";
import * as service from "./auth.service.js";

const REFRESH_COOKIE = "portal_rt";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.isProd,
    path: "/api/v1/auth",
    maxAge: config.jwt.refreshTtlDays * 24 * 60 * 60 * 1000,
  };
}

export const authRouter = Router();

authRouter.post(
  "/login",
  handler(async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    const result = await service.login(email, password, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions());
    ok(res, { user: result.user, accessToken: result.accessToken });
  }),
);

authRouter.post(
  "/refresh",
  handler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const result = await service.refresh(token ?? "", {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions());
    ok(res, { user: result.user, accessToken: result.accessToken });
  }),
);

authRouter.post(
  "/logout",
  handler(async (req, res) => {
    await service.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
    ok(res, { loggedOut: true });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  handler(async (req, res) => {
    ok(res, await service.currentUser(req.user!.id));
  }),
);
