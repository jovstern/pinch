import express from "express";
import { pino } from "pino";
import { pinoHttp } from "pino-http";
import request from "supertest";
import { expect, test } from "vitest";
import { createApp } from "./app.ts";
import { errorHandler } from "./errors.ts";

const silentLogger = pino({ level: "silent" });

test("GET /api/health answers 200 with status ok", async () => {
  const response = await request(createApp(silentLogger)).get("/api/health");
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: "ok" });
});

test("an unknown route answers 404 in the API error shape", async () => {
  const response = await request(createApp(silentLogger)).get("/api/nope");
  expect(response.status).toBe(404);
  expect(response.body).toEqual({
    error: { code: "not_found", message: "There is nothing here." },
  });
});

test("an unexpected error answers 500 without its details", async () => {
  // createApp has no route that throws, so this mounts errorHandler behind one.
  const app = express();
  app.use(pinoHttp({ logger: silentLogger }));
  app.get("/boom", () => {
    throw new Error("database password is hunter2");
  });
  app.use(errorHandler);

  const response = await request(app).get("/boom");
  expect(response.status).toBe(500);
  expect(response.body).toEqual({
    error: { code: "internal", message: "Something went wrong." },
  });
});
