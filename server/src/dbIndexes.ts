import { pino } from "pino";
import { loadConfig } from "./config.ts";
import { connectToMongo } from "./db/client.ts";
import { createIndexes } from "./db/indexes.ts";

// `npm run db:indexes`: creates the indexes in the app's database (DB_NAME).
const config = loadConfig(process.env);
const logger = pino({ level: config.LOG_LEVEL });
const client = await connectToMongo(config.MONGODB_URI);
try {
  await createIndexes(client.db(config.DB_NAME));
  logger.info({ db: config.DB_NAME }, "indexes ready");
} finally {
  await client.close();
}
