import { createHash, randomBytes } from "node:crypto";
import type { Db, ObjectId } from "mongodb";

// A signed-in browser (design §6, §8.3). The cookie holds a random token; the database keeps
// only its SHA-256, so a leaked database can't be used to sign in.
export type SessionDocument = {
  _id: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  createdAt: Date;
  // Deleted by the TTL index once passed; until then, the lookup checks it.
  expiresAt: Date;
};

export const SESSION_DAYS = 30;
export const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

export function sessionsCollection(db: Db) {
  return db.collection<SessionDocument>("sessions");
}

// 32 random bytes: too many to guess, so a fast hash (no salt, no argon2) is enough to store.
export function newToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
