import type { Response, RequestHandler } from "express";

/** Envelope de sucesso padronizado. */
export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ ok: true, data });
}

/** Envolve handlers async para propagar erros ao middleware de erro. */
export function handler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
