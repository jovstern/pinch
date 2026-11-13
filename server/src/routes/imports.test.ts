import {
  DAILY_IMPORT_CAP,
  dailyLimitMessage,
  DuplicateLinkSchema,
  globalLimitMessage,
  ImportListSchema,
  ImportSchema,
  linkKey,
  messages,
  RecipeSchema,
  type RecipeInput,
} from "@pinch/shared";
import { Binary, ObjectId } from "mongodb";
import { pino } from "pino";
import sharp from "sharp";
import request from "supertest";
import { beforeEach, expect, test } from "vitest";
import { z } from "zod";
import { createApp } from "../app.ts";
import { EXTRACTION } from "../extraction.ts";
import {
  findImportOfLink,
  IMPORT_LIFETIME_MS,
  importsCollection,
  type ImportDocument,
} from "../db/imports.ts";
import { createIndexes } from "../db/indexes.ts";
import { linksCollection } from "../db/links.ts";
import { findRecipeOfLink, recipesCollection } from "../db/recipes.ts";
import { usageCollection, utcDay } from "../db/usage.ts";
import { createTestDb } from "../testDb.ts";
import { createTestUser } from "../testUser.ts";

const db = createTestDb();
await createIndexes(db);
const app = createApp({ logger: pino({ level: "silent" }), db });
// This file's user: every request below is theirs (design §8.3).
const { userId, cookie } = await createTestUser(db);
const api = request.agent(app).set("Cookie", cookie);

const reel = "https://www.instagram.com/p/DOxAbc123/";
const usage = usageCollection(db);

// Every test here pinches as this file's user: each starts with none counted today, so the daily
// cap never refuses one by accident, and with no imports or recipes, so a link pinched in an
// earlier test isn't "pinched before", nor in the shared cache (§4.6).
beforeEach(async () => {
  await usage.deleteMany({});
  await importsCollection(db).deleteMany({});
  await recipesCollection(db).deleteMany({});
  await linksCollection(db).deleteMany({});
});

// As if this file's user had sent this many imports on that day (today when not given, worked
// out at the call, so a run across midnight UTC agrees with the route). Expiring tomorrow: the
// TTL index would delete one already due.
async function setUsage(imports: number, day = utcDay(new Date())) {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await usage.insertOne({ ownerId: userId, day, imports, expiresAt: tomorrow });
}

test("POST /api/imports accepts a link and answers 202 with a pending import", async () => {
  const response = await api.post("/api/imports").send({ type: "link", url: ` ${reel} ` });

  expect(response.status).toBe(202);
  const job = ImportSchema.parse(response.body);
  expect(response.headers.location).toBe(`/api/imports/${job.id}`);
  expect(job).toMatchObject({
    status: "pending",
    input: { type: "link", url: reel, platform: "instagram" },
    attempts: 0,
    stalled: false,
  });
  // The worker's fields are stored, not sent: it may be claimed now, and expires in a week.
  expect(response.body).not.toHaveProperty("nextAttemptAt");
  const stored = await importsCollection(db).findOne({ _id: new ObjectId(job.id) });
  if (!stored) throw new Error("The import wasn't stored.");
  expect(stored.nextAttemptAt).toEqual(stored.createdAt);
  expect(stored.expiresAt.getTime() - stored.createdAt.getTime()).toBe(IMPORT_LIFETIME_MS);
});

test.each([
  ["https://youtube.com/shorts/abc123", "youtube"],
  ["https://m.youtube.com/watch?v=abc123", "youtube"],
  ["https://youtu.be/abc123", "youtube"],
  ["https://www.facebook.com/reel/123456", "facebook"],
  ["https://fb.watch/abc123/", "facebook"],
])("POST /api/imports knows %s is from %s", async (url, platform) => {
  const response = await api.post("/api/imports").send({ type: "link", url });

  expect(response.status).toBe(202);
  expect(ImportSchema.parse(response.body).input).toMatchObject({ platform });
});

test("POST /api/imports accepts a post's pasted text", async () => {
  const text = " Shakshuka: 4 eggs, 1 can of tomatoes, 1 onion. Simmer, then crack in the eggs. ";

  const response = await api.post("/api/imports").send({ type: "text", text });

  expect(response.status).toBe(202);
  expect(ImportSchema.parse(response.body)).toMatchObject({
    status: "pending",
    input: { type: "text", text: text.trim() },
  });
});

test.each([
  ["too short to be a recipe", "eggs", messages.text],
  ["too long", "a".repeat(10_001), "Keep the text under 10,000 characters."],
])("POST /api/imports refuses a text %s, under its field", async (_, text, message) => {
  const response = await api.post("/api/imports").send({ type: "text", text });

  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({
    error: { code: "invalid_input", fields: { text: message } },
  });
});

test("POST /api/imports refuses a body that doesn't say if it's a link or a text", async () => {
  const response = await api.post("/api/imports").send({ url: reel });

  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({
    error: { code: "invalid_input", fields: { type: "Send a link or a text." } },
  });
});

test.each([
  ["a link from another site", "https://www.tiktok.com/@chef/video/123"],
  ["text that isn't a link", "pasta with tomatoes"],
  ["a link that isn't http", "javascript:alert(1)"],
  ["nothing", undefined],
])("POST /api/imports refuses %s with a 400 that names the field", async (_, url) => {
  const response = await api.post("/api/imports").send({ type: "link", url });

  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({
    error: { code: "invalid_input", fields: { url: messages.link } },
  });
});

test("GET /api/imports/:id answers the import, and 404 for one that isn't there", async () => {
  const created = await api.post("/api/imports").send({ type: "link", url: reel });
  const { id } = ImportSchema.parse(created.body);

  const found = await api.get(`/api/imports/${id}`);
  expect(found.status).toBe(200);
  expect(found.body).toEqual(created.body);

  const missing = await api.get(`/api/imports/${new ObjectId().toHexString()}`);
  expect(missing.status).toBe(404);
  expect(missing.body).toMatchObject({ error: { code: "import_not_found" } });
  expect((await api.get("/api/imports/not-an-id")).status).toBe(404);
});

// An import of mine the worker has got to: ready with a draft, or failed.
async function insertDone(fields: Partial<ImportDocument>) {
  const now = new Date();
  const job: ImportDocument = {
    _id: new ObjectId(),
    ownerId: userId,
    status: "ready",
    input: { type: "link", url: reel, platform: "instagram" },
    attempts: 1,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + IMPORT_LIFETIME_MS),
    ...fields,
  };
  await importsCollection(db).insertOne(job);
  return job._id.toHexString();
}

const draft: RecipeInput = {
  title: "Tomato pasta",
  ingredients: [{ name: "spaghetti" }],
  steps: ["Boil it."],
  tags: [],
};

test("a draft's things to look at are sent with it, and a mark whose field is gone is dropped", async () => {
  // As stored before the draft lost a step: the API checks the marks as it reads them.
  const id = await insertDone({
    draft: {
      ...draft,
      uncertain: [
        { path: "steps.0", reason: "The video skips it." },
        { path: "steps.3", reason: "No longer there." },
      ],
    },
  });

  const kept = [{ path: "steps.0", reason: "The video skips it." }];
  const job = ImportSchema.parse((await api.get(`/api/imports/${id}`)).body);
  expect(job.draft?.uncertain).toEqual(kept);
  // The queue counts them from the list.
  const list = ImportListSchema.parse((await api.get("/api/imports")).body);
  expect(list.items.find((item) => item.id === id)?.draft?.uncertain).toEqual(kept);

  // They're for the review only: the saved recipe has none.
  const approved = await api.post(`/api/imports/${id}/approve`).send(draft);
  const { id: recipeId } = RecipeSchema.parse(approved.body);
  const recipe = await recipesCollection(db).findOne({ _id: new ObjectId(recipeId) });
  expect(recipe).not.toHaveProperty("uncertain");
});

test("another user's import is not found", async () => {
  const theirs = new ObjectId();
  const now = new Date();
  await importsCollection(db).insertOne({
    _id: theirs,
    ownerId: new ObjectId(),
    status: "pending",
    input: { type: "link", url: reel, platform: "instagram" },
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + IMPORT_LIFETIME_MS),
  });

  expect((await api.get(`/api/imports/${theirs.toHexString()}`)).status).toBe(404);
  expect((await api.delete(`/api/imports/${theirs.toHexString()}`)).status).toBe(404);
  const approve = api.post(`/api/imports/${theirs.toHexString()}/approve`);
  expect((await approve.send(draft)).status).toBe(404);
  expect((await api.post(`/api/imports/${theirs.toHexString()}/retry`)).status).toBe(404);
  const list = ImportListSchema.parse((await api.get("/api/imports")).body);
  expect(list.items.map((job) => job.id)).not.toContain(theirs.toHexString());
});

test("GET /api/imports lists my imports, newest first", async () => {
  const first = await api.post("/api/imports").send({ type: "link", url: reel });
  const second = await api.post("/api/imports").send({ type: "link", url: "https://youtu.be/xyz" });

  const list = ImportListSchema.parse((await api.get("/api/imports")).body);
  const ids = list.items.map((job) => job.id);
  const newer = ids.indexOf(ImportSchema.parse(second.body).id);
  expect(newer).toBeLessThan(ids.indexOf(ImportSchema.parse(first.body).id));
});

test("DELETE /api/imports/:id deletes it, then it's not found, nor in the list", async () => {
  const created = await api.post("/api/imports").send({ type: "link", url: reel });
  const { id } = ImportSchema.parse(created.body);

  expect((await api.delete(`/api/imports/${id}`)).status).toBe(204);
  expect((await api.get(`/api/imports/${id}`)).status).toBe(404);
  expect((await api.delete(`/api/imports/${id}`)).status).toBe(404);
  const list = ImportListSchema.parse((await api.get("/api/imports")).body);
  expect(list.items.map((job) => job.id)).not.toContain(id);
  // Kept, to undo (D27), until the TTL index deletes it.
  const stored = await importsCollection(db).findOne({ _id: new ObjectId(id) });
  expect(stored?.deletedAt).toBeInstanceOf(Date);
});

test("a deleted draft can't be approved, a deleted failure can't be retried", async () => {
  const ready = await insertDone({ draft });
  const failed = await insertDone({ status: "failed", error: "No." });
  await api.delete(`/api/imports/${ready}`);
  await api.delete(`/api/imports/${failed}`);

  expect((await api.post(`/api/imports/${ready}/approve`).send(draft)).status).toBe(404);
  expect((await api.post(`/api/imports/${failed}/retry`)).status).toBe(404);
});

test("POST /api/imports/:id/restore brings a discarded draft back as it was", async () => {
  const id = await insertDone({ draft });
  const before = (await api.get(`/api/imports/${id}`)).body as unknown;
  await api.delete(`/api/imports/${id}`);

  const restored = await api.post(`/api/imports/${id}/restore`);
  expect(restored.status).toBe(200);
  expect(restored.body).toEqual(before);
  const list = ImportListSchema.parse((await api.get("/api/imports")).body);
  expect(list.items.map((job) => job.id)).toContain(id);
  expect((await api.post(`/api/imports/${id}/approve`).send(draft)).status).toBe(201);
});

test("restore of an import that isn't there, or another user's, is not found", async () => {
  const others = await importsCollection(db).insertOne({
    _id: new ObjectId(),
    ownerId: new ObjectId(),
    status: "failed",
    input: { type: "link", url: reel, platform: "instagram" },
    attempts: 3,
    nextAttemptAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + IMPORT_LIFETIME_MS),
    deletedAt: new Date(),
  });
  const other = others.insertedId.toHexString();

  expect((await api.post(`/api/imports/${other}/restore`)).status).toBe(404);
  const missing = new ObjectId().toHexString();
  expect((await api.post(`/api/imports/${missing}/restore`)).status).toBe(404);
});

test("an import no worker has taken, long after it was due, is stalled", async () => {
  const longAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recently = new Date(Date.now() - 60 * 1000);
  const ids = {
    // Its worker died, and no other took it when the lease ran out.
    heldLongAgo: await insertDone({ status: "processing", leaseUntil: longAgo }),
    dueLongAgo: await insertDone({ status: "pending", nextAttemptAt: longAgo }),
    // Workers may just be busy: not yet.
    dueRecently: await insertDone({ status: "pending", nextAttemptAt: recently }),
    readyLongAgo: await insertDone({ nextAttemptAt: longAgo, draft }),
  };

  const stalled = async (id: string) =>
    ImportSchema.parse((await api.get(`/api/imports/${id}`)).body).stalled;

  expect(await stalled(ids.heldLongAgo)).toBe(true);
  expect(await stalled(ids.dueLongAgo)).toBe(true);
  expect(await stalled(ids.dueRecently)).toBe(false);
  expect(await stalled(ids.readyLongAgo)).toBe(false);
});

test("POST /api/imports/:id/approve saves the edited draft as a recipe and deletes the import", async () => {
  const nutritionPerServing = { calories: 520, proteinG: 18, carbsG: 92, fatG: 8 };
  const id = await insertDone({ draft: { ...draft, nutritionPerServing, emoji: "🍝" } });

  // The form never sends nutrition or the emoji; ones sent anyway are dropped: the draft's are
  // the model's.
  const response = await api.post(`/api/imports/${id}/approve`).send({
    ...draft,
    title: "Nonna's tomato pasta",
    nutritionPerServing: { calories: 1, proteinG: 1, carbsG: 1, fatG: 1 },
    emoji: "🍕",
  });

  expect(response.status).toBe(201);
  const recipe = RecipeSchema.parse(response.body);
  expect(response.headers.location).toBe(`/api/recipes/${recipe.id}`);
  expect(recipe).toMatchObject({
    title: "Nonna's tomato pasta",
    nutritionPerServing,
    emoji: "🍝",
    source: { type: "instagram", url: reel },
  });
  expect((await api.get(`/api/imports/${id}`)).status).toBe(404);
  // Editing the recipe keeps where it came from, its nutrition and its emoji (design D20).
  expect((await api.put(`/api/recipes/${recipe.id}`).send(draft)).status).toBe(200);
  const stored = await recipesCollection(db).findOne({ _id: new ObjectId(recipe.id) });
  expect(stored?.sourceImportId?.toHexString()).toBe(id);
  expect(stored?.nutritionPerServing).toEqual(nutritionPerServing);
  expect(stored?.emoji).toBe("🍝");
});

test("a draft's picture is served apart, kept out of the list, and goes with it to the recipe", async () => {
  const webp = Buffer.from("a webp");
  const thumbnail = { webp: new Binary(webp), width: 400, height: 500 };
  const id = await insertDone({ draft, thumbnail });

  // The list says how big it is; the image itself comes from its own address.
  const listed = ImportListSchema.parse((await api.get("/api/imports")).body);
  expect(listed.items.find((item) => item.id === id)?.thumbnail).toEqual({
    width: 400,
    height: 500,
  });
  const image = await api.get(`/api/imports/${id}/thumbnail`);
  expect(image.headers["content-type"]).toBe("image/webp");
  expect(image.headers["cache-control"]).toBe("private, max-age=31536000, immutable");
  expect(image.body).toEqual(webp);

  const recipe = RecipeSchema.parse(
    (await api.post(`/api/imports/${id}/approve`).send(draft)).body,
  );
  expect(recipe.thumbnail).toEqual({ width: 400, height: 500 });
  // Kept when the recipe is edited (D20).
  await api.put(`/api/recipes/${recipe.id}`).send(draft);
  const kept = await api.get(`/api/recipes/${recipe.id}/thumbnail`);
  expect(kept.body).toEqual(webp);
});

test("?size=small sends the queue's tile, or the picture when it was made before tiles", async () => {
  const webp = Buffer.from("a webp");
  const small = Buffer.from("a small webp");
  const id = await insertDone({
    draft,
    thumbnail: { webp: new Binary(webp), small: new Binary(small), width: 400, height: 500 },
  });
  // The list leaves the tile out too: only the size is sent.
  const listed = ImportListSchema.parse((await api.get("/api/imports")).body);
  expect(listed.items.find((item) => item.id === id)?.thumbnail).toEqual({
    width: 400,
    height: 500,
  });
  const tile = await api.get(`/api/imports/${id}/thumbnail?size=small`);
  expect(tile.headers["content-type"]).toBe("image/webp");
  expect(tile.headers["cache-control"]).toBe("private, max-age=31536000, immutable");
  expect(tile.body).toEqual(small);
  expect((await api.get(`/api/imports/${id}/thumbnail`)).body).toEqual(webp);
  expect((await api.get(`/api/imports/${id}/thumbnail?size=huge`)).status).toBe(400);

  // No migration: an older picture has no tile, and sends itself.
  const older = await insertDone({
    draft,
    thumbnail: { webp: new Binary(webp), width: 400, height: 500 },
  });
  expect((await api.get(`/api/imports/${older}/thumbnail?size=small`)).body).toEqual(webp);
});

test("an import or a recipe with no picture: its thumbnail is not found", async () => {
  const id = await insertDone({ draft });
  expect((await api.get(`/api/imports/${id}/thumbnail`)).status).toBe(404);
  const recipe = RecipeSchema.parse(
    (await api.post(`/api/imports/${id}/approve`).send(draft)).body,
  );
  expect((await api.get(`/api/recipes/${recipe.id}/thumbnail`)).status).toBe(404);
});

test("a recipe from pasted text has text as its source, and no link", async () => {
  const id = await insertDone({
    draft,
    input: { type: "text", text: "Tomato pasta: spaghetti, tomatoes, garlic." },
  });

  const response = await api.post(`/api/imports/${id}/approve`).send(draft);

  expect(response.status).toBe(201);
  expect(RecipeSchema.parse(response.body).source).toEqual({ type: "text" });
});

test("approving again after a crash between the two writes still makes one recipe", async () => {
  const id = await insertDone({ draft });
  const first = await api.post(`/api/imports/${id}/approve`).send(draft);
  // As if the first approve had stopped after the recipe, before deleting the import.
  await insertDone({ _id: new ObjectId(id), draft });

  const second = await api.post(`/api/imports/${id}/approve`).send(draft);

  expect(second.status).toBe(201);
  expect(second.body).toEqual(first.body);
  const made = await recipesCollection(db).countDocuments({ sourceImportId: new ObjectId(id) });
  expect(made).toBe(1);
  expect((await api.get(`/api/imports/${id}`)).status).toBe(404);
});

test("approving again brings back the recipe the first approve made, if it was deleted since", async () => {
  const id = await insertDone({ draft });
  const first = await api.post(`/api/imports/${id}/approve`).send(draft);
  const { id: recipeId } = RecipeSchema.parse(first.body);
  await api.delete(`/api/recipes/${recipeId}`);
  // As if the first approve had stopped after the recipe, before deleting the import.
  await insertDone({ _id: new ObjectId(id), draft });

  const second = await api.post(`/api/imports/${id}/approve`).send(draft);

  expect(second.status).toBe(201);
  expect(second.body).toEqual(first.body);
  expect((await api.get(`/api/recipes/${recipeId}`)).status).toBe(200);
});

test("approve refuses an import with no draft yet, an invalid recipe and a missing import", async () => {
  const pending = ImportSchema.parse(
    (await api.post("/api/imports").send({ type: "link", url: reel })).body,
  );
  const notReady = await api.post(`/api/imports/${pending.id}/approve`).send(draft);
  expect(notReady.status).toBe(409);
  expect(notReady.body).toMatchObject({ error: { code: "import_not_ready" } });

  const ready = await insertDone({ draft });
  const invalid = await api.post(`/api/imports/${ready}/approve`).send({ ...draft, title: "" });
  expect(invalid.status).toBe(400);
  expect(invalid.body).toMatchObject({
    error: { code: "invalid_input", fields: { title: "Give the recipe a title." } },
  });

  const missing = new ObjectId().toHexString();
  expect((await api.post(`/api/imports/${missing}/approve`).send(draft)).status).toBe(404);
});

test("POST /api/imports/:id/retry puts a failed import back in the queue, from the start", async () => {
  const id = await insertDone({
    status: "failed",
    attempts: 3,
    error: "We couldn't.",
    noRetry: false,
  });

  const response = await api.post(`/api/imports/${id}/retry`);

  expect(response.status).toBe(202);
  const job = ImportSchema.parse(response.body);
  expect(job).toMatchObject({ status: "pending", attempts: 0 });
  expect(job).not.toHaveProperty("error");
  expect(job).not.toHaveProperty("noRetry");
  // The worker may take it now.
  const stored = await importsCollection(db).findOne({ _id: new ObjectId(id) });
  expect(stored?.nextAttemptAt.getTime()).toBeLessThanOrEqual(Date.now());
});

test("retry refuses an import that isn't failed, and a missing one", async () => {
  const id = await insertDone({ draft });
  const notFailed = await api.post(`/api/imports/${id}/retry`);
  expect(notFailed.status).toBe(409);
  expect(notFailed.body).toMatchObject({ error: { code: "import_not_failed" } });

  const missing = new ObjectId().toHexString();
  expect((await api.post(`/api/imports/${missing}/retry`)).status).toBe(404);
});

test("past the daily cap, a new link is refused with 429, and nothing is stored", async () => {
  await setUsage(DAILY_IMPORT_CAP);
  const before = await importsCollection(db).countDocuments();

  const response = await api.post("/api/imports").send({ type: "link", url: reel });

  expect(response.status).toBe(429);
  expect(response.body).toMatchObject({
    error: { code: "daily_limit", message: dailyLimitMessage },
  });
  expect(await importsCollection(db).countDocuments()).toBe(before);
});

test("past the daily cap, Retry is refused too, and the import stays failed", async () => {
  const id = await insertDone({ status: "failed", attempts: 3, error: "No." });
  await setUsage(DAILY_IMPORT_CAP);

  const response = await api.post(`/api/imports/${id}/retry`);

  expect(response.status).toBe(429);
  const job = await importsCollection(db).findOne({ _id: new ObjectId(id) });
  expect(job?.status).toBe("failed");
});

test("each link and Retry counts once for today; one that can't happen doesn't count", async () => {
  await api.post("/api/imports").send({ type: "link", url: reel });
  const failed = await insertDone({ status: "failed", attempts: 3, error: "No." });
  await api.post(`/api/imports/${failed}/retry`);
  // Not failed: 409, not counted.
  const ready = await insertDone({ draft });
  expect((await api.post(`/api/imports/${ready}/retry`)).status).toBe(409);
  // A failure no retry can fix (D23): 409, not counted, and it stays failed.
  const notARecipe = await insertDone({
    status: "failed",
    attempts: 1,
    error: "This doesn't look like a recipe.",
    noRetry: true,
  });
  const refused = await api.post(`/api/imports/${notARecipe}/retry`);
  expect(refused.status).toBe(409);
  expect(refused.body).toMatchObject({ error: { code: "import_no_retry" } });
  const still = await importsCollection(db).findOne({ _id: new ObjectId(notARecipe) });
  expect(still?.status).toBe("failed");
  // Not there: 404, not counted.
  const missing = new ObjectId().toHexString();
  expect((await api.post(`/api/imports/${missing}/retry`)).status).toBe(404);

  const counted = await usage.findOne({ ownerId: userId, day: utcDay(new Date()) });
  expect(counted?.imports).toBe(2);
  // Everyone's count too (D30): the link and the Retry.
  const everyone = await usage.findOne({ ownerId: "all", day: utcDay(new Date()) });
  expect(everyone?.imports).toBe(2);
});

test("past the daily cap, a refused import doesn't count toward the global cap", async () => {
  await setUsage(DAILY_IMPORT_CAP);

  expect((await api.post("/api/imports").send({ type: "link", url: reel })).status).toBe(429);

  expect(await usage.findOne({ ownerId: "all" })).toBeNull();
});

// The global cap (D30): everyone's imports a day, together. A small one here, and a clock the
// test moves, so it can see a new UTC day. Starting now: a count's TTL is worked out from this
// clock, and Mongo would delete one that's long past.
test("past the global cap, any user's import is refused with 429 until the next UTC day", async () => {
  let today = new Date();
  const capped = createApp({
    logger: pino({ level: "silent" }),
    db,
    globalDailyImports: 2,
    now: () => today,
  });
  const other = await createTestUser(db);
  const mine = request.agent(capped).set("Cookie", cookie);
  const theirs = request.agent(capped).set("Cookie", other.cookie);
  const text = { type: "text", text: "Mix the flour and the eggs, then bake for an hour." };
  expect((await mine.post("/api/imports").send(text)).status).toBe(202);
  expect((await theirs.post("/api/imports").send(text)).status).toBe(202);

  const refused = await theirs.post("/api/imports").send(text);
  expect(refused.status).toBe(429);
  expect(refused.body).toMatchObject({
    error: { code: "global_limit", message: globalLimitMessage },
  });
  const failed = await insertDone({ status: "failed", attempts: 3, error: "No." });
  expect((await mine.post(`/api/imports/${failed}/retry`)).status).toBe(429);
  expect(await importsCollection(db).countDocuments({ status: "pending" })).toBe(2);
  // Refused by everyone's cap, still counted as theirs: nothing is un-counted (D30).
  const theirCount = await usage.findOne({ ownerId: other.userId, day: utcDay(today) });
  expect(theirCount?.imports).toBe(2);

  today = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  expect((await theirs.post("/api/imports").send(text)).status).toBe(202);
});

test("yesterday's count doesn't count today", async () => {
  await setUsage(DAILY_IMPORT_CAP, "2000-01-01");

  const response = await api.post("/api/imports").send({ type: "link", url: reel });

  expect(response.status).toBe(202);
});

// A phone screenshot: a PNG, taller than the 1600 px it's made into.
const screenshot = await sharp({
  create: { width: 1170, height: 2532, channels: 3, background: "#fff" },
})
  .png()
  .toBuffer();

test("POST /api/imports/screenshots keeps them as small JPEGs and answers how many", async () => {
  const response = await api
    .post("/api/imports/screenshots")
    .attach("images", screenshot, "one.png")
    .attach("images", screenshot, "two.png");

  expect(response.status).toBe(202);
  const sent = ImportSchema.parse(response.body);
  expect(sent.input).toEqual({ type: "images", count: 2 });
  const stored = await importsCollection(db).findOne({ _id: new ObjectId(sent.id) });
  const images = stored?.input.images ?? [];
  expect(images).toHaveLength(2);
  const first = await sharp(images[0]?.buffer).metadata();
  expect(first).toMatchObject({ format: "jpeg", height: 1600 });

  // A recipe from them is from an image.
  await importsCollection(db).updateOne(
    { _id: new ObjectId(sent.id) },
    { $set: { status: "ready", draft } },
  );
  const recipe = RecipeSchema.parse(
    (await api.post(`/api/imports/${sent.id}/approve`).send(draft)).body,
  );
  expect(recipe.source).toEqual({ type: "image" });
});

test("screenshots are refused when there are none, more than 4, or one isn't an image", async () => {
  const refused = {
    error: {
      code: "invalid_input",
      message: "Some fields are not valid.",
      fields: { images: messages.screenshots },
    },
  };
  const none = await api.post("/api/imports/screenshots").field("note", "x");
  expect(none.status).toBe(400);
  expect(none.body).toEqual(refused);

  let five = api.post("/api/imports/screenshots");
  for (let n = 0; n < 5; n++) five = five.attach("images", screenshot, `${String(n)}.png`);
  expect((await five).body).toEqual(refused);

  const malformed = await api
    .post("/api/imports/screenshots")
    .set("Content-Type", "multipart/form-data")
    .send("abc");
  expect(malformed.body).toEqual(refused);

  const notAnImage = await api
    .post("/api/imports/screenshots")
    .attach("images", Buffer.from("not an image"), "recipe.png");
  expect(notAnImage.status).toBe(400);
  expect(notAnImage.body).toEqual(refused);
});

test("screenshots refused count nothing; past the cap they're refused with 429", async () => {
  await api
    .post("/api/imports/screenshots")
    .attach("images", Buffer.from("not an image"), "recipe.png");
  expect(await usage.findOne({ ownerId: userId })).toBeNull();

  await setUsage(DAILY_IMPORT_CAP);
  const capped = await api.post("/api/imports/screenshots").attach("images", screenshot, "one.png");
  expect(capped.status).toBe(429);
});

// A link pinched before (design §4.6): the same reel, shared again with other tracking.
const reelAgain = "https://instagram.com/p/DOxAbc123?igsh=MWQ1ZGUx";

// Pinches the reel and makes its import ready, as the worker would.
async function pinchReady() {
  const created = await api.post("/api/imports").send({ type: "link", url: reel });
  const { id } = ImportSchema.parse(created.body);
  await importsCollection(db).updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "ready", draft } },
  );
  return id;
}

test("a link the user has a recipe of answers 409 pointing to it, and nothing is stored", async () => {
  const id = await pinchReady();
  const approved = await api.post(`/api/imports/${id}/approve`).send(draft);
  const recipe = RecipeSchema.parse(approved.body);
  // Approve keeps the post with the recipe's link; the API doesn't send it.
  const stored = await recipesCollection(db).findOne({ _id: new ObjectId(recipe.id) });
  expect(stored?.source.linkKey).toBe("instagram:DOxAbc123");
  expect(recipe.source).toEqual({ type: "instagram", url: reel });
  // Editing the recipe keeps it, as the rest of its source (D20).
  await api.put(`/api/recipes/${recipe.id}`).send(draft);
  const edited = await recipesCollection(db).findOne({ _id: new ObjectId(recipe.id) });
  expect(edited?.source.linkKey).toBe("instagram:DOxAbc123");

  const response = await api.post("/api/imports").send({ type: "link", url: reelAgain });

  expect(response.status).toBe(409);
  expect(DuplicateLinkSchema.parse(response.body)).toEqual({
    error: { code: "link_pinched_before", message: "You've pinched this link before." },
    existing: { kind: "recipe", id: recipe.id, title: "Tomato pasta" },
  });
  expect(await importsCollection(db).countDocuments()).toBe(0);
});

test("a link still in the queue answers 409 with the import, and its draft's title once ready", async () => {
  const created = await api.post("/api/imports").send({ type: "link", url: reel });
  const { id } = ImportSchema.parse(created.body);

  const pending = await api.post("/api/imports").send({ type: "link", url: reelAgain });
  expect(pending.status).toBe(409);
  expect(DuplicateLinkSchema.parse(pending.body).existing).toEqual({
    kind: "import",
    id,
    status: "pending",
  });

  const uncertain = [{ path: "steps.0", reason: "The video skips it." }];
  await importsCollection(db).updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "ready", draft: { ...draft, uncertain } } },
  );
  const ready = await api.post("/api/imports").send({ type: "link", url: reelAgain });
  expect(DuplicateLinkSchema.parse(ready.body).existing).toEqual({
    kind: "import",
    id,
    status: "ready",
    title: "Tomato pasta",
    lookAt: 1,
  });
  expect(await importsCollection(db).countDocuments()).toBe(1);
});

test("a deleted recipe, a failed import or a discarded draft doesn't stop the link", async () => {
  const id = await pinchReady();
  const recipe = RecipeSchema.parse(
    (await api.post(`/api/imports/${id}/approve`).send(draft)).body,
  );
  await api.delete(`/api/recipes/${recipe.id}`);
  const again = await api.post("/api/imports").send({ type: "link", url: reelAgain });
  expect(again.status).toBe(202);

  const { id: againId } = ImportSchema.parse(again.body);
  await importsCollection(db).updateOne(
    { _id: new ObjectId(againId) },
    { $set: { status: "failed", error: "No." } },
  );
  const afterFailed = await api.post("/api/imports").send({ type: "link", url: reel });
  expect(afterFailed.status).toBe(202);

  await api.delete(`/api/imports/${ImportSchema.parse(afterFailed.body).id}`);
  const afterDiscard = await api.post("/api/imports").send({ type: "link", url: reel });
  expect(afterDiscard.status).toBe(202);
});

test("pinching a link again sets aside its failed import, so its Retry can't make a second recipe", async () => {
  const created = await api.post("/api/imports").send({ type: "link", url: reel });
  const { id: failed } = ImportSchema.parse(created.body);
  await importsCollection(db).updateOne(
    { _id: new ObjectId(failed) },
    { $set: { status: "failed", error: "No." } },
  );

  const again = await api.post("/api/imports").send({ type: "link", url: reelAgain });

  expect(again.status).toBe(202);
  expect((await api.post(`/api/imports/${failed}/retry`)).status).toBe(404);
  const list = ImportListSchema.parse((await api.get("/api/imports")).body);
  expect(list.items.map((job) => job.id)).toEqual([ImportSchema.parse(again.body).id]);
});

test("another user's recipe or import of the same link doesn't stop it", async () => {
  const theirs = new ObjectId();
  const now = new Date();
  await recipesCollection(db).insertOne({
    ...draft,
    _id: new ObjectId(),
    ownerId: theirs,
    source: { type: "instagram", url: reel, linkKey: "instagram:DOxAbc123" },
    createdAt: now,
    updatedAt: now,
  });
  await importsCollection(db).insertOne({
    _id: new ObjectId(),
    ownerId: theirs,
    status: "pending",
    input: { type: "link", url: reel, platform: "instagram" },
    linkKey: "instagram:DOxAbc123",
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + IMPORT_LIFETIME_MS),
  });

  const response = await api.post("/api/imports").send({ type: "link", url: reel });

  expect(response.status).toBe(202);
});

test("a link pinched before is a 409 even past the cap, and isn't counted", async () => {
  await api.post("/api/imports").send({ type: "link", url: reel });
  await usage.updateOne({ ownerId: userId }, { $set: { imports: DAILY_IMPORT_CAP } });

  const response = await api.post("/api/imports").send({ type: "link", url: reelAgain });

  expect(response.status).toBe(409);
  const counted = await usage.findOne({ ownerId: userId, day: utcDay(new Date()) });
  expect(counted?.imports).toBe(DAILY_IMPORT_CAP);
  // Nor toward everyone's (D30): only the first one.
  const everyone = await usage.findOne({ ownerId: "all", day: utcDay(new Date()) });
  expect(everyone?.imports).toBe(1);
});

// The shared answers (design §4.6): a post anyone pinched before costs no Gemini call, so it's free.
test("a link in the shared cache counts toward neither cap; one that isn't is refused", async () => {
  const capped = createApp({ logger: pino({ level: "silent" }), db, globalDailyImports: 2 });
  const mine = request.agent(capped).set("Cookie", cookie);
  await setUsage(DAILY_IMPORT_CAP);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await usage.insertOne({
    ownerId: "all",
    day: utcDay(new Date()),
    imports: 2,
    expiresAt: tomorrow,
  });
  // Another user's answer for this post, at the worker's version (createApp's default).
  await linksCollection(db).insertOne({
    _id: new ObjectId(),
    key: linkKey(reel),
    version: EXTRACTION.gemini.version,
    platform: "instagram",
    draft,
    model: "gemini",
    extractedAt: new Date(),
  });

  expect((await mine.post("/api/imports").send({ type: "link", url: reelAgain })).status).toBe(202);
  const other = "https://www.instagram.com/p/Other123/";
  expect((await mine.post("/api/imports").send({ type: "link", url: other })).status).toBe(429);

  // Past both caps, yet the cached one went through; only the refused one counted.
  const counted = await usage.findOne({ ownerId: userId, day: utcDay(new Date()) });
  expect(counted?.imports).toBe(DAILY_IMPORT_CAP + 1);
  expect((await usage.findOne({ ownerId: "all" }))?.imports).toBe(2);
});

// The parts of explain("executionStats") the tests read; the driver types it as any document.
const ExplainSchema = z.object({
  queryPlanner: z.object({ winningPlan: z.unknown() }),
  executionStats: z.object({ nReturned: z.number(), totalDocsExamined: z.number() }),
});

test("finding a link pinched before reads its index, and only the one it finds (§6)", async () => {
  // Many of the user's recipes and imports, each from another post.
  const now = new Date();
  const posts = Array.from({ length: 50 }, (_, n) => `instagram:post${String(n)}`);
  await recipesCollection(db).insertMany(
    posts.map((key) => ({
      ...draft,
      _id: new ObjectId(),
      ownerId: userId,
      source: { type: "instagram" as const, url: reel, linkKey: key },
      createdAt: now,
      updatedAt: now,
    })),
  );
  await importsCollection(db).insertMany(
    posts.map((key) => ({
      _id: new ObjectId(),
      ownerId: userId,
      status: "ready" as const,
      input: { type: "link" as const, url: reel, platform: "instagram" as const },
      linkKey: key,
      attempts: 1,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + IMPORT_LIFETIME_MS),
    })),
  );

  const plans = [
    await findRecipeOfLink(recipesCollection(db), userId, "instagram:post7").explain(
      "executionStats",
    ),
    await findImportOfLink(importsCollection(db), userId, "instagram:post7").explain(
      "executionStats",
    ),
  ].map((explain) => ExplainSchema.parse(explain));

  for (const { queryPlanner, executionStats } of plans) {
    const plan = JSON.stringify(queryPlanner.winningPlan);
    expect(plan).toContain("IXSCAN");
    expect(plan).toMatch(/linkKey/);
    expect(executionStats.nReturned).toBe(1);
    expect(executionStats.totalDocsExamined).toBe(1);
  }
});
