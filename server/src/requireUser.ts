import type { RequestHandler } from "express";
import type { Db, ObjectId } from "mongodb";
import { HttpError } from "./errors.ts";
import { clearSignedInHint, currentSession } from "./session.ts";

// Adds userId to Express's Request type, where every handler can read it.
declare module "express-serve-static-core" {
  interface Request {
    userId: ObjectId;
  }
}

// In front of every route that reads or writes a user's data: req.userId is the signed-in user,
// and every query filters by it; no session is a 401 (design §8.3, D13). It reads the session
// only, one lookup by an index: the routes need the user's id, not the account.
export function requireUser(db: Db): RequestHandler {
  return async (req, res, next) => {
    const session = await currentSession(db, req);
    if (!session) {
      clearSignedInHint(req, res);
      throw new HttpError(401, "signed_out", "Log in to continue.");
    }
    req.userId = session.userId;
    next();
  };
}
