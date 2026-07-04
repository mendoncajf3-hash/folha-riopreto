import { EventEmitter } from "node:events";
import { logger } from "../logger.js";

/**
 * Event bus interno — o canal assíncrono de comunicação entre módulos.
 * Um módulo publica um evento tipado; outros assinam sem conhecê-lo.
 * Regra de arquitetura: nenhum módulo importa outro; eles só se falam por aqui.
 *
 * Implementação atual: EventEmitter em processo. Preparado para trocar por
 * uma fila (Redis/BullMQ) na Fase 5, mantendo a mesma interface publish/on.
 */
export interface DomainEvents {
  "shift.created": { shiftId: string; userId: string; baseId: string; date: string };
  "shift.updated": { shiftId: string; status: string };
  "shift.substituted": { shiftId: string; substituteId: string };
  "user.created": { userId: string; email: string };
  [key: string]: unknown;
}

type EventName = keyof DomainEvents & string;

class EventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  publish<E extends EventName>(event: E, payload: DomainEvents[E]): void {
    logger.debug({ event, payload }, "event.published");
    this.emitter.emit(event, payload);
  }

  on<E extends EventName>(event: E, handler: (payload: DomainEvents[E]) => void): void {
    this.emitter.on(event, (payload) => {
      try {
        handler(payload as DomainEvents[E]);
      } catch (err) {
        logger.error({ err, event }, "event.handler.failed");
      }
    });
  }
}

export const bus = new EventBus();
