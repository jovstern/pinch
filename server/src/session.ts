import type { Request, Response } from "express";
import { ObjectId, type Db } from "mongodb";
import { hashToken, newToken, SESSION_MS, sessionsCollection } from "./db/sessions.ts";
import { usersCollection } from "./db/users.ts";

// The session cookie (design §8.3). HttpOnly: no script can read it. SameSite=Lax: another site
// can't send it with a POST (CSRF). Secure outside development and tests, which run on
// http://localhost.
export const SESSION_COOKIE = "pinch_session";

function cookieOptions(secure: boolean) {
  return { httpOnly: true, sameSite: "lax", path: "/", secure } as const;
}

// A new session on every sign-in: the database keeps the token's hash, the browser the token.
// The browser's previous session, if it sent one, ends: one browser, one session.
export async function startSession(
  db: Db,
  req: Request,
  res: Response,
  userId: ObjectId,
  secure: boolean,
) {
  await deleteSession(db, req);
  const token = newToken();
  const now = new Date();
  await sessionsCollection(db).insertOne({
    _id: new ObjectId(),
    userId,
    tokenHash: hashToken(token),
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_MS),
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(secure), maxAge: SESSION_MS });
}

export async function endSession(db: Db, req: Request, res: Response, secure: boolean) {
  await deleteSession(db, req);
  res.clearCookie(SESSION_COOKIE, cookieOptions(secure));
}

async function deleteSession(db: Db, req: Request) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) await sessionsCollection(db).deleteOne({ tokenHash: hashToken(token) });
}

// The request's user, from its cookie, or null when signed out. A session past its expiresAt
// counts as none: the TTL index deletes it only within a minute or so.
export async function currentUser(db: Db, req: Request) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const session = await sessionsCollection(db).findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;
  return usersCollection(db).findOne({ _id: session.userId });
}

// The one cookie we read, from the Cookie header ("a=1; pinch_session=…"). A few lines instead
// of a package: our token is base64url, so it needs no decoding.
function readCookie(req: Request, name: string) {
  for (const pair of (req.headers.cookie ?? "").split(";")) {
    const [key, value] = pair.trim().split("=");
    if (key === name) return value;
  }
  return undefined;
}
