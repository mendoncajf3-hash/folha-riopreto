import { prisma } from "../../core/db.js";
import { bus } from "../../core/events/bus.js";
import { logger } from "../../core/logger.js";

/**
 * Assinaturas de eventos do módulo de Notificações.
 * Demonstra a regra de arquitetura: este módulo REAGE a eventos de Escalas
 * sem nunca importar o módulo Escalas. Amanhã, Indicadores/BI podem assinar
 * os mesmos eventos sem que Escalas mude uma linha.
 */
export function registerNotificationListeners(): void {
  bus.on("shift.substituted", async ({ shiftId, substituteId }) => {
    await prisma.notification.create({
      data: {
        userId: substituteId,
        type: "escala.substituicao",
        title: "Você foi escalado como substituto",
        body: "Um turno foi atribuído a você por substituição.",
        link: `/escalas?shift=${shiftId}`,
      },
    });
    logger.debug({ shiftId, substituteId }, "notificacao.substituicao.criada");
  });

  logger.info("Notificações: listeners registrados");
}
