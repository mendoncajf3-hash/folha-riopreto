import { createApp } from "./app.js";
import { config } from "./core/config.js";
import { logger } from "./core/logger.js";

const app = createApp();

app.listen(config.port, () => {
  logger.info(`API do Portal Operacional na porta ${config.port} (${config.env})`);
});
