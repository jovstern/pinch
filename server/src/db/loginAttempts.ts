import type { Db } from "mongodb";

// The login rate limit (design §8.3): tries per IP and per email, counted per minute, so no one
// can guess passwords fast. A fixed one-minute window: simple, and enough at this scale. An IP
// gets more: a household, or everyone behind one proxy, shares it.
export const LOGIN_TRIES_PER_EMAIL = 5;
export const LOGIN_TRIES_PER_IP = 20;

export type LoginAttemptDocument = {
  // "ip 127.0.0.1 2026-11-11T10:05" or "email a@b.com 2026-11-11T10:05": what is counted and its
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
// $inc, as countImport (usage.ts); a refused try is counted too.
export async function countLoginTry(db: Db, key: string, limit: number) {
  const now = new Date();
  const minute = now.toISOString().slice(0, 16);
  const count = await loginAttemptsCollection(db).findOneAndUpdate(
    { _id: `${key} ${minute}` },
    { $inc: { tries: 1 }, $setOnInsert: { expiresAt: new Date(now.getTime() + 2 * 60_000) } },
    { upsert: true, returnDocument: "after" },
  );
  return (count?.tries ?? 0) <= limit;
}
