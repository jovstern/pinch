import type { RecipeInput } from "@pinch/shared";
import { ObjectId } from "mongodb";
import { pino } from "pino";
import { expect, test } from "vitest";
import {
  claimNextImport,
  IMPORT_LIFETIME_MS,
  importsCollection,
  LEASE_MS,
  type ImportDocument,
} from "../db/imports.ts";
import { createIndexes } from "../db/indexes.ts";
import { createTestDb } from "../testDb.ts";
import { runImport, workLoop } from "./workLoop.ts";

const db = createTestDb();
await createIndexes(db);
const imports = importsCollection(db);
const logger = pino({ level: "silent" });

const draft: RecipeInput = {
  title: "Tomato pasta",
  ingredients: [{ name: "spaghetti" }],
  steps: ["Boil it."],
  tags: [],
};
const extractNow = () => Promise.resolve(draft);

// A job as POST /api/imports makes it, with any field changed. Each test clears the collection
// first: the claim takes any owner's job, so jobs left by another test would be claimed too.
async function insertImport(fields: Partial<ImportDocument> = {}) {
  const now = new Date();
  const job: ImportDocument = {
    _id: new ObjectId(),
    ownerId: new ObjectId(),
    status: "pending",
    input: { type: "link", url: "https://youtu.be/abc", platform: "youtube" },
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + IMPORT_LIFETIME_MS),
    ...fields,
  };
  await imports.insertOne(job);
  return job;
}

test("the claim takes the oldest waiting job, holds it for the lease and counts the attempt", async () => {
  await imports.deleteMany({});
  const older = await insertImport({ createdAt: new Date(Date.now() - 1000) });
  await insertImport();
  const now = new Date();

  const claimed = await claimNextImport(imports, now);

  expect(claimed?._id).toEqual(older._id);
  expect(claimed).toMatchObject({
    status: "processing",
    attempts: 1,
    leaseUntil: new Date(now.getTime() + LEASE_MS),
  });
});

test("two workers claiming at once never take the same job", async () => {
  await imports.deleteMany({});
  await insertImport();

  const [first, second] = await Promise.all([
    claimNextImport(imports, new Date()),
    claimNextImport(imports, new Date()),
  ]);

  expect([first, second].filter((job) => job !== null)).toHaveLength(1);
});

test("a job waits until its time; a held job waits until its lease runs out", async () => {
  await imports.deleteMany({});
  const now = new Date();
  await insertImport({ nextAttemptAt: new Date(now.getTime() + 10_000) });
  await insertImport({
    status: "processing",
    attempts: 1,
    leaseUntil: new Date(now.getTime() + 1),
  });
  expect(await claimNextImport(imports, now)).toBeNull();

  // A worker crashed holding this one: once the lease has passed, it's claimed again.
  const crashed = await insertImport({ status: "processing", attempts: 1, leaseUntil: now });
  const claimed = await claimNextImport(imports, new Date(now.getTime() + 1));
  expect(claimed).toMatchObject({ _id: crashed._id, status: "processing", attempts: 2 });
});

test("a run saves the draft and lets go of the job", async () => {
  await imports.deleteMany({});
  await insertImport();
  const job = await claimNextImport(imports, new Date());
  if (!job) throw new Error("Nothing claimed.");

  await runImport(imports, job, extractNow, logger);

  const saved = await imports.findOne({ _id: job._id });
  expect(saved).toMatchObject({ status: "ready", draft });
  expect(saved).not.toHaveProperty("leaseUntil");
});

test("a run whose job was deleted, or claimed again by another worker, saves nothing", async () => {
  await imports.deleteMany({});
  await insertImport();
  const job = await claimNextImport(imports, new Date());
  if (!job) throw new Error("Nothing claimed.");
  // This attempt outlived its lease, and another worker took the job.
  const later = await claimNextImport(imports, new Date(Date.now() + LEASE_MS + 1));

  await runImport(imports, job, extractNow, logger);
  expect(await imports.findOne({ _id: job._id })).toMatchObject({
    status: "processing",
    attempts: 2,
  });

  await imports.deleteOne({ _id: job._id });
  if (later) await runImport(imports, later, extractNow, logger);
  expect(await imports.countDocuments()).toBe(0);
});

test("the loop runs waiting jobs until it's stopped", async () => {
  await imports.deleteMany({});
  const job = await insertImport();
  const stop = new AbortController();

  const loop = workLoop({ imports, extract: extractNow, logger, signal: stop.signal });
  await expect.poll(async () => (await imports.findOne({ _id: job._id }))?.status).toBe("ready");
  stop.abort();
  await loop;
});
