import { pino } from "pino";
import { loadConfig } from "./config.ts";
import { backfillLinkKeys } from "./db/backfillLinkKeys.ts";
import { connectToMongo } from "./db/client.ts";

// `npm run db:backfill-link-keys`: gives the links and recipes saved before L1 their post's key
// (design §4.6), in the app's database (DB_NAME). Safe to run again.
const config = loadConfig(process.env);
const logger = pino({ level: config.LOG_LEVEL });
const client = await connectToMongo(config.MONGODB_URI);
try {
  const changed = await backfillLinkKeys(client.db(config.DB_NAME));
  logger.info({ db: config.DB_NAME, changed }, "link keys ready");
} finally {
  await client.close();
}
