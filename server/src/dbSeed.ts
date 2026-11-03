import { ObjectId } from "mongodb";
import { pino } from "pino";
import { loadConfig } from "./config.ts";
import { connectToMongo } from "./db/client.ts";
import { seedRecipes } from "./db/seed.ts";

// `npm run db:seed`: adds the sample recipes for the dev user in the app's database (DB_NAME).
const config = loadConfig(process.env);
const logger = pino({ level: config.LOG_LEVEL });
const client = await connectToMongo(config.MONGODB_URI);
try {
  const added = await seedRecipes(client.db(config.DB_NAME), new ObjectId(config.DEV_USER_ID));
  logger.info({ db: config.DB_NAME, added }, "sample recipes ready");
} finally {
  await client.close();
}
