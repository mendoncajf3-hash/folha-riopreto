import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors.js";
import { logger } from "../logger.js";

/** Converte qualquer erro no envelope de erro padronizado da API. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      ok: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }
  logger.error({ err }, "unhandled.error");
  res.status(500).json({
    ok: false,
    error: { code: "INTERNAL", message: "Erro interno do servidor" },
  });
}

/** Rota não encontrada. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    ok: false,
    error: { code: "NOT_FOUND", message: "Rota não encontrada" },
  });
}
