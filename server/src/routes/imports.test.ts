import {
  ImportListSchema,
  ImportSchema,
  linkMessage,
  RecipeSchema,
  type RecipeInput,
} from "@pinch/shared";
import { ObjectId } from "mongodb";
import { pino } from "pino";
import request from "supertest";
import { expect, test } from "vitest";
import { createApp } from "../app.ts";
import { loadConfig } from "../config.ts";
import { IMPORT_LIFETIME_MS, importsCollection, type ImportDocument } from "../db/imports.ts";
import { createIndexes } from "../db/indexes.ts";
import { recipesCollection } from "../db/recipes.ts";
import { createTestDb } from "../testDb.ts";

const config = loadConfig(process.env);
const db = createTestDb();
await createIndexes(db);
const app = createApp({ logger: pino({ level: "silent" }), db, devUserId: config.DEV_USER_ID });

const reel = "https://www.instagram.com/p/DOxAbc123/";

test("POST /api/imports accepts a link and answers 202 with a pending import", async () => {
  const response = await request(app)
    .post("/api/imports")
    .send({ url: ` ${reel} ` });

  expect(response.status).toBe(202);
  const job = ImportSchema.parse(response.body);
  expect(response.headers.location).toBe(`/api/imports/${job.id}`);
  expect(job).toMatchObject({
    status: "pending",
    input: { type: "link", url: reel, platform: "instagram" },
    attempts: 0,
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
  const response = await request(app).post("/api/imports").send({ url });

  expect(response.status).toBe(202);
  expect(ImportSchema.parse(response.body).input.platform).toBe(platform);
});

test.each([
  ["a link from another site", "https://www.tiktok.com/@chef/video/123"],
  ["text that isn't a link", "pasta with tomatoes"],
  ["a link that isn't http", "javascript:alert(1)"],
  ["nothing", undefined],
])("POST /api/imports refuses %s with a 400 that names the field", async (_, url) => {
  const response = await request(app).post("/api/imports").send({ url });

  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({
    error: { code: "invalid_input", fields: { url: linkMessage } },
  });
});

test("GET /api/imports/:id answers the import, and 404 for one that isn't there", async () => {
  const created = await request(app).post("/api/imports").send({ url: reel });
  const { id } = ImportSchema.parse(created.body);

  const found = await request(app).get(`/api/imports/${id}`);
  expect(found.status).toBe(200);
  expect(found.body).toEqual(created.body);

  const missing = await request(app).get(`/api/imports/${new ObjectId().toHexString()}`);
  expect(missing.status).toBe(404);
  expect(missing.body).toMatchObject({ error: { code: "import_not_found" } });
  expect((await request(app).get("/api/imports/not-an-id")).status).toBe(404);
});

// An import of mine the worker has got to: ready with a draft, or failed.
async function insertDone(fields: Partial<ImportDocument>) {
  const now = new Date();
  const job: ImportDocument = {
    _id: new ObjectId(),
    ownerId: new ObjectId(config.DEV_USER_ID),
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

  expect((await request(app).get(`/api/imports/${theirs.toHexString()}`)).status).toBe(404);
  expect((await request(app).delete(`/api/imports/${theirs.toHexString()}`)).status).toBe(404);
  const approve = request(app).post(`/api/imports/${theirs.toHexString()}/approve`);
  expect((await approve.send(draft)).status).toBe(404);
  expect((await request(app).post(`/api/imports/${theirs.toHexString()}/retry`)).status).toBe(404);
  const list = ImportListSchema.parse((await request(app).get("/api/imports")).body);
  expect(list.items.map((job) => job.id)).not.toContain(theirs.toHexString());
});

test("GET /api/imports lists my imports, newest first", async () => {
  const first = await request(app).post("/api/imports").send({ url: reel });
  const second = await request(app).post("/api/imports").send({ url: "https://youtu.be/xyz" });

  const list = ImportListSchema.parse((await request(app).get("/api/imports")).body);
  const ids = list.items.map((job) => job.id);
  const newer = ids.indexOf(ImportSchema.parse(second.body).id);
  expect(newer).toBeLessThan(ids.indexOf(ImportSchema.parse(first.body).id));
});

test("DELETE /api/imports/:id deletes it, then it's not found", async () => {
  const created = await request(app).post("/api/imports").send({ url: reel });
  const { id } = ImportSchema.parse(created.body);

  expect((await request(app).delete(`/api/imports/${id}`)).status).toBe(204);
  expect((await request(app).get(`/api/imports/${id}`)).status).toBe(404);
  expect((await request(app).delete(`/api/imports/${id}`)).status).toBe(404);
});

test("POST /api/imports/:id/approve saves the edited draft as a recipe and deletes the import", async () => {
  const id = await insertDone({ draft });

  const response = await request(app)
    .post(`/api/imports/${id}/approve`)
    .send({ ...draft, title: "Nonna's tomato pasta" });

  expect(response.status).toBe(201);
  const recipe = RecipeSchema.parse(response.body);
  expect(response.headers.location).toBe(`/api/recipes/${recipe.id}`);
  expect(recipe).toMatchObject({
    title: "Nonna's tomato pasta",
    source: { type: "instagram", url: reel },
  });
  expect((await request(app).get(`/api/imports/${id}`)).status).toBe(404);
  // Editing the recipe keeps where it came from (design D20).
  expect((await request(app).put(`/api/recipes/${recipe.id}`).send(draft)).status).toBe(200);
  const stored = await recipesCollection(db).findOne({ _id: new ObjectId(recipe.id) });
  expect(stored?.sourceImportId?.toHexString()).toBe(id);
});

test("approving again after a crash between the two writes still makes one recipe", async () => {
  const id = await insertDone({ draft });
  const first = await request(app).post(`/api/imports/${id}/approve`).send(draft);
  // As if the first approve had stopped after the recipe, before deleting the import.
  await insertDone({ _id: new ObjectId(id), draft });

  const second = await request(app).post(`/api/imports/${id}/approve`).send(draft);

  expect(second.status).toBe(201);
  expect(second.body).toEqual(first.body);
  const made = await recipesCollection(db).countDocuments({ sourceImportId: new ObjectId(id) });
  expect(made).toBe(1);
  expect((await request(app).get(`/api/imports/${id}`)).status).toBe(404);
});

test("approve refuses an import with no draft yet, an invalid recipe and a missing import", async () => {
  const pending = ImportSchema.parse(
    (await request(app).post("/api/imports").send({ url: reel })).body,
  );
  const notReady = await request(app).post(`/api/imports/${pending.id}/approve`).send(draft);
  expect(notReady.status).toBe(409);
  expect(notReady.body).toMatchObject({ error: { code: "import_not_ready" } });

  const ready = await insertDone({ draft });
  const invalid = await request(app)
    .post(`/api/imports/${ready}/approve`)
    .send({ ...draft, title: "" });
  expect(invalid.status).toBe(400);
  expect(invalid.body).toMatchObject({
    error: { code: "invalid_input", fields: { title: "Give the recipe a title." } },
  });

  const missing = new ObjectId().toHexString();
  expect((await request(app).post(`/api/imports/${missing}/approve`).send(draft)).status).toBe(404);
});

test("POST /api/imports/:id/retry puts a failed import back in the queue, from the start", async () => {
  const id = await insertDone({ status: "failed", attempts: 3, error: "We couldn't." });

  const response = await request(app).post(`/api/imports/${id}/retry`);

  expect(response.status).toBe(202);
  const job = ImportSchema.parse(response.body);
  expect(job).toMatchObject({ status: "pending", attempts: 0 });
  expect(job).not.toHaveProperty("error");
  // The worker may take it now.
  const stored = await importsCollection(db).findOne({ _id: new ObjectId(id) });
  expect(stored?.nextAttemptAt.getTime()).toBeLessThanOrEqual(Date.now());
});

test("retry refuses an import that isn't failed, and a missing one", async () => {
  const id = await insertDone({ draft });
  const notFailed = await request(app).post(`/api/imports/${id}/retry`);
  expect(notFailed.status).toBe(409);
  expect(notFailed.body).toMatchObject({ error: { code: "import_not_failed" } });

  const missing = new ObjectId().toHexString();
  expect((await request(app).post(`/api/imports/${missing}/retry`)).status).toBe(404);
});
