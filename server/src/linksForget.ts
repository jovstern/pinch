import { pino } from "pino";
import { loadConfig } from "./config.ts";
import { connectToMongo } from "./db/client.ts";
import { forgetLink, linksCollection } from "./db/links.ts";

// `npm run links:forget <url>`: removes a post's shared answer, at every version, from the app's
// database (DB_NAME), so the next pinch reads it again (design §4.6). For a wrong answer, which is
// otherwise served to everyone until the prompt or the model changes.
const url = process.argv[2];
if (!url) throw new Error("Usage: npm run links:forget <url>");
const config = loadConfig(process.env);
const logger = pino({ level: config.LOG_LEVEL });
const client = await connectToMongo(config.MONGODB_URI);
try {
  const forgotten = await forgetLink(linksCollection(client.db(config.DB_NAME)), url);
  logger.info({ db: config.DB_NAME, url, forgotten }, "link forgotten");
} finally {
  await client.close();
}
