import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { config } from "./core/config.js";
import { logger } from "./core/logger.js";
import { errorHandler, notFoundHandler } from "./core/middleware/error.js";
import { httpModules, registerEventListeners } from "./core/registry/modules.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.webOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger, autoLogging: !config.isProd }));

  // Healthcheck
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, data: { status: "up", time: new Date().toISOString() } });
  });

  // Monta cada módulo sob /api/v1/<basePath>
  const apiV1 = express.Router();
  for (const mod of httpModules) {
    apiV1.use(mod.basePath, mod.router);
    logger.info(`Módulo montado: /api/v1${mod.basePath}`);
  }
  app.use("/api/v1", apiV1);

  // Listeners de eventos entre módulos
  registerEventListeners();

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
