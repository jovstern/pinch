import type { z } from "zod";

// A failed answer from the API. The status lets a screen tell "not found" from "broken".
export class ApiError extends Error {
  status: number;

  constructor(method: string, path: string, status: number) {
    super(`${method} ${path} answered ${String(status)}`);
    this.name = "ApiError";
    this.status = status;
  }
}

// Every read from the API goes through here: a failed answer throws (TanStack Query shows the
// error state), and the body is parsed with its shared schema before a component sees it.
export async function getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new ApiError("GET", path, response.status);
  return schema.parse(await response.json());
}

export async function deleteResource(path: string) {
  const response = await fetch(path, { method: "DELETE" });
  if (!response.ok) throw new ApiError("DELETE", path, response.status);
}
