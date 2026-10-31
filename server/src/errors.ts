import type { ErrorRequestHandler, RequestHandler } from "express";

// Handlers throw an HttpError for a failure the user should see; one middleware turns it into
// the API's error shape (design §8.2). No try/catch in each route.
export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
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
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  // Anything else is a bug: log it with the request id, and never send internals to the client.
  req.log.error({ err: error }, "unhandled error");
  res.status(500).json({ error: { code: "internal", message: "Something went wrong." } });
};
