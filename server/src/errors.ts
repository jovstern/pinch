import type { ErrorRequestHandler, RequestHandler } from "express";
import type { z } from "zod";

// Handlers throw an HttpError for a failure the user should see; one middleware turns it into
// the API's error shape (design §8.2). No try/catch in each route. parseInput, below, is how
// a handler reads its input and throws the 400.
export class HttpError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

// Every request body and query is parsed before the handler uses it; a failure is a 400 that
// names each field, by its path like "ingredients.0.name" (design §8.1).
export function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  // No body at all (or not an object) has no field to name.
  if (result.error.issues.some((issue) => issue.path.length === 0)) {
    throw new HttpError(400, "bad_request", "Send the data as a JSON object.");
  }
  // One message per field: the first, which is what the user should fix first.
  const fields = Object.fromEntries(
    result.error.issues
      .toReversed()
      .map((issue) => [issue.path.map(String).join("."), issue.message]),
  );
  throw new HttpError(400, "invalid_input", "Some fields are not valid.", fields);
}

export const notFound: RequestHandler = () => {
  throw new HttpError(404, "not_found", "There is nothing here.");
};

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  // Too late to send our JSON once the response has started; Express then closes the connection.
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof HttpError) {
    const { status, code, message, fields } = error;
    res.status(status).json({ error: { code, message, fields } });
    return;
  }
  // express.json() rejects a body that isn't JSON (400) or is too big (413) with an error that
  // carries its status. Those are the client's mistake, not a bug. Its own message would echo
  // the body back, so the answer uses ours.
  if (isClientError(error)) {
    const tooLarge = error.status === 413;
    res.status(error.status).json({
      error: tooLarge
        ? { code: "too_large", message: "The request is too large." }
        : { code: "bad_request", message: "The request body isn't valid JSON." },
    });
    return;
  }
  // Anything else is a bug: log it with the request id, and never send internals to the client.
  req.log.error({ err: error }, "unhandled error");
  res.status(500).json({ error: { code: "internal", message: "Something went wrong." } });
};

function isClientError(error: unknown): error is Error & { status: number } {
  return (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500
  );
}
