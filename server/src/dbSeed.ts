import { pino } from "pino";
import { loadConfig } from "./config.ts";
import { connectToMongo } from "./db/client.ts";
import { seedRecipes } from "./db/seed.ts";
import { findAccount } from "./db/users.ts";

// `npm run db:seed <email>`: adds the sample recipes for the account with this email, in the
// app's database (DB_NAME). Sign up in the app first. Safe to run again.
const email = process.argv[2];
if (!email) throw new Error("Which account? npm run db:seed <email>");
const config = loadConfig(process.env);
const logger = pino({ level: config.LOG_LEVEL });
const client = await connectToMongo(config.MONGODB_URI);
try {
  const db = client.db(config.DB_NAME);
  const user = await findAccount(db, email);
  const added = await seedRecipes(db, user._id);
  logger.info({ db: config.DB_NAME, email: user.email, added }, "sample recipes ready");
} finally {
  await client.close();
}
