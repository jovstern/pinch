import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import { afterAll } from "vitest";
import { loadConfig } from "./config.ts";

// Tests never touch the app's data: each test file gets its own database, dropped at the end.
export function createTestDb() {
  const client = new MongoClient(loadConfig(process.env).MONGODB_URI);
  const db = client.db(`pinch-test-${randomUUID()}`);
  afterAll(async () => {
    await db.dropDatabase();
    await client.close();
  });
  return db;
}
