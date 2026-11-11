import { ObjectId } from "mongodb";
import { expect, test } from "vitest";
import { createTestDb } from "../testDb.ts";
import { forgetLink, linksCollection } from "./links.ts";

const db = createTestDb();
const links = linksCollection(db);

function anAnswer(key: string, version: string) {
  return {
    _id: new ObjectId(),
    key,
    version,
    url: "https://www.instagram.com/reel/C9x/",
    platform: "instagram" as const,
    draft: { title: "Shakshuka", ingredients: [{ name: "eggs" }], steps: ["Cook it."], tags: [] },
    model: "gemini",
    extractedAt: new Date(),
  };
}

test("links:forget removes a post's answers at every version, found from any of its links", async () => {
  await links.insertMany([
    anAnswer("instagram:C9x", "v1"),
    anAnswer("instagram:C9x", "v2"),
    anAnswer("instagram:Other", "v2"),
  ]);

  const forgotten = await forgetLink(links, "https://instagram.com/reels/C9x?igsh=abc");

  expect(forgotten).toBe(2);
  expect(await links.find({}, { projection: { _id: 0, key: 1 } }).toArray()).toEqual([
    { key: "instagram:Other" },
  ]);
});
