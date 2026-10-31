import { pino } from "pino";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";

const config = loadConfig(process.env);
const logger = pino({ level: config.LOG_LEVEL });
const app = createApp(logger);

const server = app.listen(config.PORT, (error) => {
  if (error) throw error;
  logger.info({ port: config.PORT }, "API listening");
});

// Graceful shutdown: stop taking new requests and let the ones in flight finish.
process.on("SIGTERM", () => {
  logger.info("SIGTERM: shutting down");
  server.close(() => process.exit(0));
});
