import { z } from "zod";

// A failed answer from the API. The status lets a screen tell "not found" from "broken"; a 400
// also names each invalid field (design §8.1), so a form can show the messages where they belong.
export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;

  constructor(method: string, path: string, status: number, fields: Record<string, string> = {}) {
    super(`${method} ${path} answered ${String(status)}`);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

// Every read from the API goes through here: a failed answer throws (TanStack Query shows the
// error state), and the body is parsed with its shared schema before a component sees it.
export async function getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new ApiError("GET", path, response.status);
  return schema.parse(await response.json());
}

// Every write with a body: the same, plus the fields of a 400.
export async function sendJson<T>(
  method: "POST" | "PUT",
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new ApiError(method, path, response.status, await errorFields(response));
  }
  return schema.parse(await response.json());
}

export async function deleteResource(path: string) {
  const response = await fetch(path, { method: "DELETE" });
  if (!response.ok) throw new ApiError("DELETE", path, response.status);
}

const ErrorBodySchema = z.object({
  error: z.object({ fields: z.record(z.string(), z.string()).optional() }),
});

// The API's error shape (design §8.2). A proxy's error page isn't JSON: then there are no fields.
async function errorFields(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  return ErrorBodySchema.safeParse(body).data?.error.fields ?? {};
}
