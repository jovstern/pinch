import type { RequestHandler } from "express";
import { ObjectId } from "mongodb";

// Adds userId to Express's Request type, where every handler can read it.
declare module "express-serve-static-core" {
  interface Request {
    userId: ObjectId;
  }
}

// v1 has no login, so every request acts as the one dev user. Every query already filters by
// req.userId; when auth is built, only this middleware changes (design §8.3, D13).
export function devUser(userId: string): RequestHandler {
  const id = new ObjectId(userId);
  return (req, _res, next) => {
    req.userId = id;
    next();
  };
}
