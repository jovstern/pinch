import type { Db } from "mongodb";

// The login rate limit (design §8.3): tries per IP and per email, counted per minute, so no one
// can guess passwords fast. Sign-ups per IP are counted here too: each hashes a password, which
// takes 19 MiB of memory, so a burst of them could exhaust the server. A fixed one-minute window: simple, and enough at this scale. An IP
// gets more: a household, or everyone behind one proxy, shares it.
export const LOGIN_TRIES_PER_EMAIL = 5;
export const LOGIN_TRIES_PER_IP = 20;
export const SIGNUPS_PER_IP = 10;

export type LoginAttemptDocument = {
  // "ip 127.0.0.1 2026-11-11T10:05", "email a@b.com …" or "signup ip …": what is counted and its
  // minute, so the _id is the count's key and needs no index of its own.
  _id: string;
  tries: number;
  // Deleted by the TTL index once its minute is long over.
  expiresAt: Date;
};

export function loginAttemptsCollection(db: Db) {
  return db.collection<LoginAttemptDocument>("loginAttempts");
}

// Counts one more try for the key, and says whether it's still within the limit. One atomic
// $inc, as countImport (usage.ts); a refused try is counted too. `now` is the router's clock, so
// tests can pin the minute.
export async function countLoginTry(db: Db, key: string, limit: number, now: Date) {
  const minute = now.toISOString().slice(0, 16);
  const count = await loginAttemptsCollection(db).findOneAndUpdate(
    { _id: `${key} ${minute}` },
    { $inc: { tries: 1 }, $setOnInsert: { expiresAt: new Date(now.getTime() + 2 * 60_000) } },
    { upsert: true, returnDocument: "after" },
  );
  return (count?.tries ?? 0) <= limit;
}
