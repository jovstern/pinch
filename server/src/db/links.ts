import { linkKey, type Platform, type RecipeDraft } from "@pinch/shared";
import type { Collection, Db, ObjectId } from "mongodb";
import type { StoredThumbnail } from "./thumbnail.ts";

// The model's answer for a public post, shared by everyone who pinches it (design §4.6, D28):
// one per post and extraction version, with no owner. A cache, not a queue: nothing claims or
// retries it. Each import that hits it gets its own copy of the draft.
export type LinkDocument = {
  _id: ObjectId;
  // The post (linkKey) and EXTRACTION_VERSION: unique together.
  key: string;
  version: string;
  // Not the link itself: its tracking parameters (igsh, si…) can name who shared it, and this
  // collection has no owner and never expires. The key says which post it is.
  platform: Platform;
  draft: RecipeDraft;
  thumbnail?: StoredThumbnail;
  model: string;
  extractedAt: Date;
};

export function linksCollection(db: Db) {
  return db.collection<LinkDocument>("links");
}

// The answer for this post at this version, if anyone has pinched it (the unique index).
export function findCached(links: Collection<LinkDocument>, key: string, version: string) {
  return links.findOne({ key, version });
}

// Whether there's one, without reading its draft and picture: the API's free-hit check (§4.6).
export async function isCached(links: Collection<LinkDocument>, key: string, version: string) {
  return (await links.countDocuments({ key, version }, { limit: 1 })) > 0;
}

// Keeps an answer; a fresher one replaces the one there, whole, so an old picture never stays
// beside a new draft. Upsert: two workers saving the same post at once still leave one, as Mongo
// retries a duplicate-key upsert itself when the filter is equality on the unique index's fields.
export async function saveCached(links: Collection<LinkDocument>, link: Omit<LinkDocument, "_id">) {
  await links.replaceOne({ key: link.key, version: link.version }, link, { upsert: true });
}

// links:forget: a wrong answer, removed at every version, so the next pinch asks again (§4.6).
export async function forgetLink(links: Collection<LinkDocument>, url: string) {
  const { deletedCount } = await links.deleteMany({ key: linkKey(url) });
  return deletedCount;
}
