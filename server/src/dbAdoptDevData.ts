import { ObjectId } from "mongodb";
import { pino } from "pino";
import { loadConfig } from "./config.ts";
import { adoptDevData } from "./db/adoptDevData.ts";
import { connectToMongo } from "./db/client.ts";

// `npm run db:adopt-dev-data <email>`: run once after signing up, in the app's database
// (DB_NAME). The dev user's recipes, imports and counts become the account's (design §8.3).
const email = process.argv[2];
if (!email) throw new Error("Which account? npm run db:adopt-dev-data <email>");
const config = loadConfig(process.env);
const logger = pino({ level: config.LOG_LEVEL });
const client = await connectToMongo(config.MONGODB_URI);
try {
  const db = client.db(config.DB_NAME);
  const moved = await adoptDevData(db, new ObjectId(config.DEV_USER_ID), email);
  logger.info({ db: config.DB_NAME, email, ...moved }, "the dev user's data is the account's");
} finally {
  await client.close();
}
