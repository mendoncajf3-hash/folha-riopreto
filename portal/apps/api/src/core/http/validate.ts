import type { ZodSchema } from "zod";
import { Errors } from "../errors.js";

/** Valida `data` contra um schema Zod; lança AppError 422 formatado se falhar. */
export function parse<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw Errors.validation(result.error.flatten());
  }
  return result.data;
}
