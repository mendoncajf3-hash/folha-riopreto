/** Erros de aplicação com código estável e status HTTP. */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  unauthorized: (msg = "Não autenticado") => new AppError("UNAUTHORIZED", msg, 401),
  forbidden: (msg = "Sem permissão para esta ação") => new AppError("FORBIDDEN", msg, 403),
  notFound: (msg = "Recurso não encontrado") => new AppError("NOT_FOUND", msg, 404),
  conflict: (msg = "Conflito de dados") => new AppError("CONFLICT", msg, 409),
  validation: (details: unknown, msg = "Dados inválidos") =>
    new AppError("VALIDATION", msg, 422, details),
  badRequest: (msg = "Requisição inválida") => new AppError("BAD_REQUEST", msg, 400),
};
