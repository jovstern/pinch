import type { Health, Providers } from "@pinch/shared";
import express from "express";
import helmet from "helmet";
import type { Db } from "mongodb";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";
import { errorHandler, HttpError, notFound } from "./errors.ts";
import type { Google } from "./google.ts";
import { authRouter } from "./routes/auth.ts";
import { googleRouter } from "./routes/google.ts";
import { importsRouter } from "./routes/imports.ts";
import { recipesRouter } from "./routes/recipes.ts";
import { requireUser } from "./requireUser.ts";

// secureCookies: the session cookie is Secure unless the caller says it runs on http (development
// and tests); a caller who forgets gets the safe one. trustProxy: how many proxies stand in front
// of the API, so req.ip is the browser's address (TRUST_PROXY in config). now: the rate limit's
// clock (design §8.3). google: Google sign-in, when configured (googleFromConfig; tests pass a
// fake exchange).
type AppDeps = {
  logger: Logger;
  db: Db;
  secureCookies?: boolean;
  trustProxy?: number;
  now?: () => Date;
  google?: Google;
};

// Builds the app without listening, so tests can call it with Supertest (node-api.md).
export function createApp({
  logger,
  db,
  secureCookies = true,
  trustProxy = 0,
  now = () => new Date(),
  google,
}: AppDeps) {
  const app = express();
  app.set("trust proxy", trustProxy);
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
          // Not Google sign-in's query: its callback's code and state are secrets (§8.3).
          url: req.url.startsWith("/api/auth/google/") ? req.url.split("?")[0] : req.url,
        }),
        res: (res: { statusCode: number | null }) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (_req, res, error) => (error || res.statusCode >= 500 ? "error" : "info"),
    }),
  );
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

  // Which ways to sign in the Log in page offers (§8.3). Without Google's settings, its routes
  // aren't mounted: 404.
  app.get("/api/auth/providers", (_req, res) => {
    res.json({ google: google !== undefined } satisfies Providers);
  });
  if (google) app.use("/api/auth/google", googleRouter(db, { google, secureCookies, now }));
  app.use("/api/auth", authRouter(db, { secureCookies, now }));
  // Health and auth above are open; a user's recipes and imports need a session (§8.3).
  app.use("/api/recipes", requireUser(db), recipesRouter(db));
  app.use("/api/imports", requireUser(db), importsRouter(db));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
