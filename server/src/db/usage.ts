import { DAILY_IMPORT_CAP } from "@pinch/shared";
import type { Collection, Db, ObjectId } from "mongodb";

// How many links a user has pinched (or retried) on a day: each one costs Gemini calls, so
// there's a daily cap (design §1, §4.1). A count of its own, because imports are deleted once
// done and counting them would undercount.
export type UsageDocument = {
  ownerId: ObjectId;
  // The UTC day, "2026-11-07": the cap starts again at midnight UTC.
  day: string;
  imports: number;
  // Deleted by the TTL index once the day is long over.
  expiresAt: Date;
};

export function usageCollection(db: Db) {
  return db.collection<UsageDocument>("usage");
}

// Counts one more import for today, and says whether it's within the cap. One atomic $inc, so
// two at once can't both slip under it. The day's document is made by the first one (upsert);
// two firsts at once are safe too, as Mongo retries an upsert that hits the unique index.
export async function countImport(usage: Collection<UsageDocument>, ownerId: ObjectId) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const counted = await usage.findOneAndUpdate(
    { ownerId, day },
    {
      $inc: { imports: 1 },
      $setOnInsert: { expiresAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) },
    },
    { upsert: true, returnDocument: "after" },
  );
  // Refused ones are counted too: the count goes past the cap, which changes nothing.
  return counted !== null && counted.imports <= DAILY_IMPORT_CAP;
}
