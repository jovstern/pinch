import { randomUUID } from "node:crypto";
import express from "express";
import { MongoClient } from "mongodb";
import { pino } from "pino";
import { pinoHttp } from "pino-http";
import request from "supertest";
import { afterAll, expect, test } from "vitest";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { errorHandler } from "./errors.ts";

const config = loadConfig(process.env);
const logger = pino({ level: "silent" });

// Tests never touch the app's data: this run gets its own database, dropped at the end.
const client = new MongoClient(config.MONGODB_URI);
const db = client.db(`pinch-test-${randomUUID()}`);
afterAll(async () => {
  await db.dropDatabase();
  await client.close();
});

const app = createApp({ logger, db, devUserId: config.DEV_USER_ID });

test("GET /api/health answers 200 with status ok", async () => {
  const response = await request(app).get("/api/health");
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: "ok" });
});

test("GET /api/ready answers 200 when the database is reachable", async () => {
  const response = await request(app).get("/api/ready");
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: "ok" });
});

test("GET /api/ready answers 503 when the database can't be reached", async () => {
  // Nothing listens on port 1, and a short timeout keeps the test fast.
  const unreachable = new MongoClient("mongodb://localhost:1", { serverSelectionTimeoutMS: 200 });
  const appWithoutDb = createApp({
    logger,
    db: unreachable.db("x"),
    devUserId: config.DEV_USER_ID,
  });

  const response = await request(appWithoutDb).get("/api/ready");
  expect(response.status).toBe(503);
  expect(response.body).toEqual({
    error: { code: "db_unreachable", message: "The database can't be reached." },
  });
  await unreachable.close();
});

test("an unknown route answers 404 in the API error shape", async () => {
  const response = await request(app).get("/api/nope");
  expect(response.status).toBe(404);
  expect(response.body).toEqual({
    error: { code: "not_found", message: "There is nothing here." },
  });
});

test("an unexpected error answers 500 without its details", async () => {
  // createApp has no route that throws, so this mounts errorHandler behind one.
  const appThatThrows = express();
  appThatThrows.use(pinoHttp({ logger }));
  appThatThrows.get("/boom", () => {
    throw new Error("database password is hunter2");
  });
  appThatThrows.use(errorHandler);

  const response = await request(appThatThrows).get("/boom");
  expect(response.status).toBe(500);
  expect(response.body).toEqual({
    error: { code: "internal", message: "Something went wrong." },
  });
});
