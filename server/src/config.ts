import { ObjectId } from "mongodb";
import { z } from "zod";

// The environment is parsed once at startup, so a bad value stops the app before it serves
// anything (node-api.md).
const ConfigSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  MONGODB_URI: z.string().default("mongodb://localhost:27017"),
  DB_NAME: z.string().default("pinch"),
  // v1 has no login: every request acts as this user (design §8.3). Not a secret, so it has a
  // default and works without any .env entry.
  DEV_USER_ID: z
    .string()
    .refine((id) => ObjectId.isValid(id), "must be a 24-character hex ObjectId")
    .default("000000000000000000000001"),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  return ConfigSchema.parse(env);
}
