import type { Request, Response } from "express";
import { ObjectId, type Db } from "mongodb";
import { hashToken, newToken, SESSION_MS, sessionsCollection } from "./db/sessions.ts";
import { toMe, usersCollection, type UserDocument } from "./db/users.ts";

// The session cookie (design §8.3). HttpOnly: no script can read it. SameSite=Lax: another site
// can't send it with a POST (CSRF). Secure outside development and tests, which run on
// http://localhost.
export const SESSION_COOKIE = "pinch_session";

function cookieOptions(secure: boolean) {
  return { httpOnly: true, sameSite: "lax", path: "/", secure } as const;
}

// A hint for index.html, beside the session (design §8.3): "1" while this browser has one. Not
// HttpOnly, so the page's script can read it before any request, and preload the queue only for a
// browser that is signed in (a signed-out one would get a 401, an error in the console). Only a
// hint: it holds nothing secret, and the API still decides from the session cookie. It goes with
// the session, and as soon as the API sees a request without a live one (clearSignedInHint).
export const SIGNED_IN_HINT = "pinch_signed_in";

function hintOptions(secure: boolean) {
  return { ...cookieOptions(secure), httpOnly: false };
}

// The hint goes when the session does (logout), and when a browser still has it but no live
// session (expired, or logged out elsewhere), so the next page doesn't preload the queue for
// nothing. Only when the request has it: no cookie to clear, no header.
export function clearSignedInHint(req: Request, res: Response, secure: boolean) {
  if (readCookie(req, SIGNED_IN_HINT)) res.clearCookie(SIGNED_IN_HINT, hintOptions(secure));
}

// The interface's language, for index.html (design §8.3, §16.2): its script reads it before the
// first paint and sets <html lang dir>. Like the hint, not HttpOnly and nothing secret, but it lasts
// a year and logout keeps it: the device stays in the last language, so Log in shows in it. The
// account decides; the cookie only says it early. Set with every session, by me and by PATCH me.
const LANGUAGE_COOKIE = "pinch_lang";
const LANGUAGE_MS = 365 * 24 * 60 * 60_000;

export function setLanguageCookie(res: Response, user: UserDocument, secure: boolean) {
  res.cookie(LANGUAGE_COOKIE, toMe(user).language, { ...hintOptions(secure), maxAge: LANGUAGE_MS });
}

// A new session on every sign-in: the database keeps the token's hash, the browser the token.
// The browser's previous session, if it sent one, ends: one browser, one session.
export async function startSession(
  db: Db,
  req: Request,
  res: Response,
  user: UserDocument,
  secure: boolean,
) {
  await deleteSession(db, req);
  const token = newToken();
  const now = new Date();
  await sessionsCollection(db).insertOne({
    _id: new ObjectId(),
    userId: user._id,
    tokenHash: hashToken(token),
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_MS),
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(secure), maxAge: SESSION_MS });
  setSignedInHint(res, secure);
  setLanguageCookie(res, user, secure);
}

// Also from me, for a session that began before the hint did: it lasts as long as a new one.
export function setSignedInHint(res: Response, secure: boolean) {
  res.cookie(SIGNED_IN_HINT, "1", { ...hintOptions(secure), maxAge: SESSION_MS });
}

export async function endSession(db: Db, req: Request, res: Response, secure: boolean) {
  await deleteSession(db, req);
  res.clearCookie(SESSION_COOKIE, cookieOptions(secure));
  clearSignedInHint(req, res, secure);
}

async function deleteSession(db: Db, req: Request) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) await sessionsCollection(db).deleteOne({ tokenHash: hashToken(token) });
}

// The request's session, from its cookie, or null when signed out. A session past its expiresAt
// counts as none: the TTL index deletes it only within a minute or so.
export async function currentSession(db: Db, req: Request) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  return sessionsCollection(db).findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
}

// The request's user, or null when signed out: for GET /api/auth/me, which shows the account.
export async function currentUser(db: Db, req: Request) {
  const session = await currentSession(db, req);
  if (!session) return null;
  return usersCollection(db).findOne({ _id: session.userId });
}

// A cookie of ours, from the Cookie header ("a=1; pinch_session=…"). A few lines instead of a
// package: our values are base64url, so they need no decoding.
export function readCookie(req: Request, name: string) {
  for (const pair of (req.headers.cookie ?? "").split(";")) {
    const [key, value] = pair.trim().split("=");
    if (key === name) return value;
  }
  return undefined;
}
