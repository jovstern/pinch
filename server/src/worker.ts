import { GoogleGenAI } from "@google/genai";
import { once } from "node:events";
import { pino } from "pino";
import { loadConfig } from "./config.ts";
import { connectToMongo } from "./db/client.ts";
import { importsCollection } from "./db/imports.ts";
import { fakeExtract } from "./worker/fakeExtract.ts";
import { geminiExtract } from "./worker/geminiExtract.ts";
import { workLoop, type Extract } from "./worker/workLoop.ts";

// The import worker: a process of its own, so a slow or crashing import never touches the API
// (design D5). It shares nothing with the API but the database, where the jobs are (D4).
const config = loadConfig(process.env);
// Named, so its log lines can be told from the API's.
const logger = pino({ level: config.LOG_LEVEL, name: "worker" });

// Gemini, or the fake for e2e (design §9). Only the worker needs the key, so only the worker
// asks for it: the API runs without one.
let extract: Extract = fakeExtract;
if (config.EXTRACTOR === "gemini") {
  if (!config.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing: set it in .env, or run with EXTRACTOR=fake.");
  }
  // A timeout on every request, as each call gives its own: the upload's are bound only by this.
  extract = geminiExtract(
    new GoogleGenAI({ apiKey: config.GEMINI_API_KEY, httpOptions: { timeout: 120_000 } }),
  );
}

const client = await connectToMongo(config.MONGODB_URI);
const imports = importsCollection(client.db(config.DB_NAME));

// Loops side by side, each a job at a time: at most two jobs at once, within Gemini's rate
// limits (§4.3). A database error doesn't end it: each loop logs it and tries again (workLoop).
const JOBS_AT_A_TIME = 2;
const stop = new AbortController();
const loops = Array.from({ length: JOBS_AT_A_TIME }, () =>
  workLoop({ imports, extract, logger, signal: stop.signal }),
);
logger.info({ extractor: config.EXTRACTOR }, "worker started");

// As the API: on SIGTERM, take no new jobs, finish the ones in hand, then close the database. A
// job cut off by a harder stop is claimed again when its lease runs out.
await once(process, "SIGTERM");
logger.info("SIGTERM: finishing the jobs in hand");
stop.abort();
await Promise.all(loops);
await client.close();
