import type { Health } from "@pinch/shared";
import express from "express";
import helmet from "helmet";
import type { Db } from "mongodb";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";
import { devUser } from "./devUser.ts";
import { errorHandler, HttpError, notFound } from "./errors.ts";
import { authRouter } from "./routes/auth.ts";
import { importsRouter } from "./routes/imports.ts";
import { recipesRouter } from "./routes/recipes.ts";

// secureCookies: the session cookie is Secure outside development and tests (design §8.3).
type AppDeps = { logger: Logger; db: Db; devUserId: string; secureCookies?: boolean };

// Builds the app without listening, so tests can call it with Supertest (node-api.md).
export function createApp({ logger, db, devUserId, secureCookies = false }: AppDeps) {
  const app = express();
  app.use(helmet());
  // One log line per request, with a request id, method, URL, status and duration. The URL
  // with its query: a search's words are kept, they're not secret. Not the headers (pino-http's
  // default): cookies and tokens would be written down once auth comes (§8.3), and they made
  // each line about 1.7 kB. The serializers get pino's own request and response (pino-http
  // wraps them), so url is express's originalUrl; pino doesn't type them, hence the shapes here.
  // A 5xx's line is an error, as the handler's own line about it.
  app.use(
    pinoHttp({
      logger,
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode: number | null }) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (_req, res, error) => (error || res.statusCode >= 500 ? "error" : "info"),
    }),
  );
  app.use(devUser(devUserId));
  // JSON bodies only, up to express's default 100 kB: far more than any recipe needs.
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" } satisfies Health);
  });

  app.get("/api/ready", async (req, res) => {
    // The one route that catches: it turns a driver error into a known 503 (design §8.2).
    try {
      await db.command({ ping: 1 });
    } catch (error) {
      req.log.warn({ err: error }, "database ping failed");
      // 503, not 500: the API itself is fine, it just can't serve until Mongo is back.
      throw new HttpError(503, "db_unreachable", "The database can't be reached.");
    }
    res.json({ status: "ok" } satisfies Health);
  });

  app.use("/api/auth", authRouter(db, { secureCookies }));
  app.use("/api/recipes", recipesRouter(db));
  app.use("/api/imports", importsRouter(db));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
