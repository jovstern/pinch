import { ImportListSchema, ImportSchema, linkMessage } from "@pinch/shared";
import { ObjectId } from "mongodb";
import { pino } from "pino";
import request from "supertest";
import { expect, test } from "vitest";
import { createApp } from "../app.ts";
import { loadConfig } from "../config.ts";
import { IMPORT_LIFETIME_MS, importsCollection } from "../db/imports.ts";
import { createIndexes } from "../db/indexes.ts";
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
