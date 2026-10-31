import express from "express";
import helmet from "helmet";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";
import { errorHandler, notFound } from "./errors.ts";

// Builds the app without listening, so tests can call it with Supertest (node-api.md).
export function createApp(logger: Logger) {
  const app = express();
  app.use(helmet());
  // One log line per request, with a request id, method, path, status and duration.
  app.use(pinoHttp({ logger }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
