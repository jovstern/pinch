import { z } from "zod";

// The environment is parsed once at startup, so a bad value stops the app before it serves
// anything (node-api.md).
const ConfigSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  return ConfigSchema.parse(env);
}
