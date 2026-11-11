import { z } from "zod";

// A failed answer from the API. The status lets a screen tell "not found" from "broken"; a 400
// also names each invalid field (design §8.1), so a form can show the messages where they belong.
// body is the whole answer, for the few that say more (a link pinched before, §4.6).
export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string>;
  readonly body: unknown;

  constructor(
    method: string,
    path: string,
    status: number,
    fields: Record<string, string> = {},
    body?: unknown,
  ) {
    super(`${method} ${path} answered ${String(status)}`);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
    this.body = body;
  }
}

// Every read from the API goes through here: a failed answer throws (TanStack Query shows the
// error state), and the body is parsed with its shared schema before a component sees it.
export async function getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new ApiError("GET", path, response.status);
  return schema.parse(await response.json());
}

// Every write that answers JSON: the same, plus the fields of a 400. The body may be undefined
// (retry has none): JSON.stringify(undefined) is undefined, so fetch sends no body.
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
  if (!response.ok) throw await apiError(method, path, response);
  return schema.parse(await response.json());
}

// A form with files (screenshots): as sendJson, but the browser sets the type, with its boundary.
export async function sendForm<T>(path: string, body: FormData, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(path, { method: "POST", body });
  if (!response.ok) throw await apiError("POST", path, response);
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
async function apiError(method: string, path: string, response: Response) {
  const body: unknown = await response.json().catch(() => null);
  const fields = ErrorBodySchema.safeParse(body).data?.error.fields ?? {};
  return new ApiError(method, path, response.status, fields, body);
}
