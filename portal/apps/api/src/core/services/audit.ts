import { prisma } from "../db.js";
import { logger } from "../logger.js";

/**
 * Registro de auditoria transversal. Qualquer módulo chama `audit(...)`
 * após uma ação relevante. Nunca lança — auditoria não pode derrubar a operação.
 */
export async function audit(input: {
  userId?: string | null;
  module: string;
  entity: string;
  entityId?: string | null;
  action: string;
  diff?: unknown;
  ip?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        module: input.module,
        entity: input.entity,
        entityId: input.entityId ?? null,
        action: input.action,
        diff: (input.diff as object) ?? undefined,
        ip: input.ip ?? null,
      },
    });
  } catch (err) {
    logger.error({ err }, "audit.write.failed");
  }
}
