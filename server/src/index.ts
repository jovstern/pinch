import { once } from "node:events";
import { pino } from "pino";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { connectToMongo } from "./db.ts";

const config = loadConfig(process.env);
const logger = pino({ level: config.LOG_LEVEL });
const client = await connectToMongo(config.MONGODB_URI);
const app = createApp({ logger, db: client.db(config.DB_NAME), devUserId: config.DEV_USER_ID });

const server = app.listen(config.PORT, (error) => {
  if (error) throw error;
  logger.info({ port: config.PORT }, "API listening");
});

// Graceful shutdown: stop taking new requests, let the ones in flight finish, then close the
// database connection.
await once(process, "SIGTERM");
logger.info("SIGTERM: shutting down");
await new Promise((resolve) => server.close(resolve));
await client.close();
