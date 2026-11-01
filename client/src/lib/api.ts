import type { z } from "zod";

// Every read from the API goes through here: a failed answer throws (TanStack Query shows the
// error state), and the body is parsed with its shared schema before a component sees it.
export async function getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`GET ${path} answered ${String(response.status)}`);
  return schema.parse(await response.json());
}
