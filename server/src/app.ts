import express from "express";
import helmet from "helmet";
import type { Db } from "mongodb";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";
import { devUser } from "./devUser.ts";
import { errorHandler, HttpError, notFound } from "./errors.ts";

type AppDeps = { logger: Logger; db: Db; devUserId: string };

// Builds the app without listening, so tests can call it with Supertest (node-api.md).
export function createApp({ logger, db, devUserId }: AppDeps) {
  const app = express();
  app.use(helmet());
  // One log line per request, with a request id, method, path, status and duration.
  app.use(pinoHttp({ logger }));
  app.use(devUser(devUserId));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/ready", async (_req, res) => {
    try {
      await db.command({ ping: 1 });
    } catch {
      // 503, not 500: the API itself is fine, it just can't serve until Mongo is back.
      throw new HttpError(503, "db_unreachable", "The database can't be reached.");
    }
    res.json({ status: "ok" });
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
