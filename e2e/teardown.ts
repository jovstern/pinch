import { MongoClient } from "mongodb";

// Drops the run's database (playwright.config.ts), like the server tests do. The same URI
// as the API it started, which falls back to the same default (server/src/config.ts).
export default async function teardown() {
  // A guard, because a wrong name here would drop real data.
  const dbName = process.env.E2E_DB_NAME;
  if (!dbName?.startsWith("pinch-test-")) throw new Error(`Refusing to drop ${String(dbName)}`);
  const client = new MongoClient(process.env.MONGODB_URI ?? "mongodb://localhost:27017");
  await client.db(dbName).dropDatabase();
  await client.close();
}
