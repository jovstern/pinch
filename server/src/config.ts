import { ObjectId } from "mongodb";
import { z } from "zod";

// The environment is parsed once at startup, so a bad value stops the app before it serves
// anything (node-api.md).
const ConfigSchema = z.object({
  // "production" makes the session cookie Secure (design §8.3); development and tests run on
  // http://localhost, where a browser wouldn't send it back.
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // How many proxies stand in front of the API, so req.ip (the rate limits' IP) is the browser's,
  // read from X-Forwarded-For; 0, none, trusts no header (design §8.3). A count, never "true":
  // trusting every hop would let anyone pick their IP.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  MONGODB_URI: z.string().default("mongodb://localhost:27017"),
  DB_NAME: z.string().default("pinch"),
  // The user every request acted as before accounts (design §8.3): only db:adopt-dev-data reads
  // it now, to give that user's data to an account. Not a secret, so it has a default.
  DEV_USER_ID: z
    .string()
    .refine((id) => ObjectId.isValid(id), "must be a 24-character hex ObjectId")
    .default("000000000000000000000001"),
  // The worker's: Gemini turns links into drafts (design §9); e2e uses the fake, which needs no
  // key and costs nothing. The key is a secret, so it has no default: it's in .env.
  EXTRACTOR: z.enum(["gemini", "fake"]).default("gemini"),
  GEMINI_API_KEY: z.string().optional(),
  // Google sign-in (design §8.3): off unless both are set, in .env, by the user. Secrets, so no
  // defaults.
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  // The address the browser opens the app at: Google sends the user back to
  // <PUBLIC_URL>/api/auth/google/callback. In development that's Vite's, which proxies /api.
  PUBLIC_URL: z.url().default("http://localhost:5173"),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  return ConfigSchema.parse(env);
}
