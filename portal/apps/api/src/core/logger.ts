import { pino } from "pino";
import { config } from "./config.js";

/**
 * Logger estruturado (JSON) escrito diretamente em stdout.
 * Evita workers de transporte por simplicidade e robustez em qualquer ambiente;
 * em produção, um coletor (ex.: Loki/pino-pretty) consome o stdout do processo.
 */
export const logger = pino({
  level: config.isProd ? "info" : "debug",
});
