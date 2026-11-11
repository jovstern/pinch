import { ObjectId, type Db } from "mongodb";
import { hashToken, newToken, SESSION_MS, sessionsCollection } from "./db/sessions.ts";
import { usersCollection } from "./db/users.ts";
import { SESSION_COOKIE } from "./session.ts";

// A signed-in user for a route test: an account and a session, written straight to the database
// as signup writes them (without its password hash, which is slow and not what's tested). Returns
// their id and the Cookie header that signs in as them (design §8.3).
export async function createTestUser(db: Db) {
  const userId = new ObjectId();
  const now = new Date();
  await usersCollection(db).insertOne({
    _id: userId,
    email: `${userId.toHexString()}@example.com`,
    name: "Cook",
    createdAt: now,
  });
  const token = newToken();
  await sessionsCollection(db).insertOne({
    _id: new ObjectId(),
    userId,
    tokenHash: hashToken(token),
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_MS),
  });
  return { userId, cookie: `${SESSION_COOKIE}=${token}` };
}
