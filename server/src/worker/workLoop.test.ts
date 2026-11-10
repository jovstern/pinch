import type { RecipeInput } from "@pinch/shared";
import { Binary, ObjectId } from "mongodb";
import { pino } from "pino";
import { beforeEach, expect, onTestFinished, test, vi } from "vitest";
import {
  claimNextImport,
  IMPORT_LIFETIME_MS,
  importsCollection,
  LEASE_MS,
  type ImportDocument,
} from "../db/imports.ts";
import { createIndexes } from "../db/indexes.ts";
import { createTestDb } from "../testDb.ts";
import { FAILED_MESSAGE, NoRetryError, runImport, workLoop, type Extract } from "./workLoop.ts";

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
// Fails after its first step, as a real attempt would: the step is left to be cleared.
const extractFails: Extract = async (_input, _signal, { setStep }) => {
  await setStep("fetching");
  throw new Error("The site is down.");
};

// Runs a claimed job, with no deadline unless one is given.
function run(
  job: ImportDocument,
  extract: Extract = extractNow,
  deadline = new AbortController().signal,
) {
  return runImport({ imports, extract, logger, job, deadline });
}

// Claims the one job waiting, as the loop does.
async function claim(now = new Date()) {
  const job = await claimNextImport(imports, now);
  if (!job) throw new Error("Nothing claimed.");
  return job;
}

// The claim takes any owner's job, so each test starts with none: one left by another test
// would be claimed too.
beforeEach(async () => {
  await imports.deleteMany({});
});

// A job as POST /api/imports makes it, with any field changed.
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
  await insertImport();

  const [first, second] = await Promise.all([
    claimNextImport(imports, new Date()),
    claimNextImport(imports, new Date()),
  ]);

  expect([first, second].filter((job) => job !== null)).toHaveLength(1);
});

test("a job waits until its time; a held job waits until its lease runs out", async () => {
  const now = new Date();
  await insertImport({ nextAttemptAt: new Date(now.getTime() + 10_000) });
  await insertImport({
    status: "processing",
    attempts: 1,
    leaseUntil: new Date(now.getTime() + 10_000),
  });
  expect(await claimNextImport(imports, now)).toBeNull();

  // A worker crashed holding this one: its lease has passed, so it's claimed again, without
  // the step the crashed attempt had got to.
  const crashed = await insertImport({
    status: "processing",
    step: "analyzing",
    attempts: 1,
    leaseUntil: new Date(now.getTime() - 1000),
  });
  const claimed = await claimNextImport(imports, now);
  expect(claimed).toMatchObject({ _id: crashed._id, status: "processing", attempts: 2 });
  expect(claimed).not.toHaveProperty("step");
});

test("a run saves the draft and lets go of the job", async () => {
  await insertImport();
  const job = await claim();

  await run(job);

  const saved = await imports.findOne({ _id: job._id });
  expect(saved).toMatchObject({ status: "ready", draft });
  expect(saved).not.toHaveProperty("leaseUntil");
});

test("a run keeps the draft's things to look at, and drops a mark that names no field of it", async () => {
  await insertImport();
  const job = await claim();

  await run(job, () =>
    Promise.resolve({
      ...draft,
      uncertain: [
        { path: "ingredients.0.quantity", reason: " Not said in the video. " },
        // Past the last step, not a field, a number written oddly, and no reason: dropped.
        { path: "steps.1", reason: "Gone." },
        { path: "description", reason: "Not a markable field." },
        { path: "steps.00", reason: "Malformed." },
        { path: "servings", reason: "" },
        // A field's first mark is kept.
        { path: "ingredients.0.quantity", reason: "Again." },
        // A dropped mark (no reason) doesn't hide a good one for the same field.
        { path: "title", reason: "" },
        { path: "title", reason: "Made up." },
      ],
    }),
  );

  const saved = await imports.findOne({ _id: job._id });
  expect(saved?.draft?.uncertain).toEqual([
    { path: "ingredients.0.quantity", reason: "Not said in the video." },
    { path: "title", reason: "Made up." },
  ]);
});

test("a reason too long is cut, not a failed draft", async () => {
  await insertImport();
  const job = await claim();

  const uncertain = [{ path: "title", reason: "x".repeat(201) }];
  await run(job, () => Promise.resolve({ ...draft, uncertain }));

  const saved = await imports.findOne({ _id: job._id });
  expect(saved?.status).toBe("ready");
  expect(saved?.draft?.uncertain).toEqual([{ path: "title", reason: "x".repeat(200) }]);
});

test("a list of marks that isn't well formed is dropped, and the draft saved", async () => {
  // null, a mark with no reason, a number for a path: each as the model might send it.
  for (const uncertain of [null, [{ path: "title" }], [{ path: 3, reason: "A number." }]]) {
    await imports.deleteMany({});
    await insertImport();
    const job = await claim();

    await run(job, () => Promise.resolve({ ...draft, uncertain }));

    const saved = await imports.findOne({ _id: job._id });
    expect(saved).toMatchObject({ status: "ready", draft });
    expect(saved?.draft).not.toHaveProperty("uncertain");
  }
});

test("a draft keeps its emoji, and drops one that isn't a single emoji", async () => {
  // One emoji, a ZWJ sequence (one grapheme), then what the model might send instead.
  const cases = [
    ["🍲", "🍲"],
    ["🧑‍🍳", "🧑‍🍳"],
    ["🍲🥗", undefined],
    ["soup", undefined],
    ["", undefined],
    [null, undefined],
    [7, undefined],
  ];
  for (const [emoji, kept] of cases) {
    await imports.deleteMany({});
    await insertImport();
    const job = await claim();

    await run(job, () => Promise.resolve({ ...draft, emoji }));

    const saved = await imports.findOne({ _id: job._id });
    expect(saved?.status).toBe("ready");
    expect(saved?.draft?.emoji).toBe(kept);
  }
});

test("a draft keeps no more than 10 things to look at", async () => {
  await insertImport();
  const job = await claim();
  const steps = Array.from({ length: 12 }, (_, i) => `Step ${String(i + 1)}.`);
  const uncertain = steps.map((_, i) => ({ path: `steps.${String(i)}`, reason: "Unclear." }));

  await run(job, () => Promise.resolve({ ...draft, steps, uncertain }));

  const saved = await imports.findOne({ _id: job._id });
  expect(saved?.draft?.uncertain).toEqual(uncertain.slice(0, 10));
});

test("a run shows its step while it's working, and clears it when it's done", async () => {
  const { _id } = await insertImport();
  let stepWhileWorking: unknown;

  await run(await claim(), async (_input, _signal, { setStep }) => {
    await setStep("analyzing");
    stepWhileWorking = (await imports.findOne({ _id }))?.step;
    return draft;
  });

  expect(stepWhileWorking).toBe("analyzing");
  expect(await imports.findOne({ _id })).not.toHaveProperty("step");
});

test("screenshots are kept for a failed attempt's next try, and dropped once the draft is made", async () => {
  const images = [new Binary(Buffer.from("a jpeg"))];
  const { _id } = await insertImport({ input: { type: "images", count: 1, images } });

  await run(await claim(), extractFails);
  expect((await imports.findOne({ _id }))?.input.images).toHaveLength(1);

  await run(await claim(new Date(Date.now() + 11_000)));
  expect(await imports.findOne({ _id })).toMatchObject({
    status: "ready",
    input: { type: "images", count: 1 },
  });
  expect((await imports.findOne({ _id }))?.input).not.toHaveProperty("images");
});

test("a run whose job another worker claimed again saves nothing", async () => {
  await insertImport();
  const job = await claim();
  // This attempt outlived its lease, and another worker took the job.
  await claimNextImport(imports, new Date(Date.now() + LEASE_MS + 1000));

  await run(job);

  expect(await imports.findOne({ _id: job._id })).toMatchObject({
    status: "processing",
    attempts: 2,
  });
});

test("a run whose job the user deleted saves nothing", async () => {
  await insertImport();
  const job = await claim();
  await imports.deleteOne({ _id: job._id });

  await run(job);

  expect(await imports.countDocuments()).toBe(0);
});

test("a failed attempt is tried again after 10 s, then 60 s, then the import is failed", async () => {
  const { _id } = await insertImport();

  const first = await claim();
  await run(first, extractFails);
  const afterFirst = await imports.findOne({ _id });
  expect(afterFirst).toMatchObject({ status: "pending", attempts: 1 });
  expect(afterFirst).not.toHaveProperty("leaseUntil");
  expect(afterFirst).not.toHaveProperty("step");
  expect(afterFirst?.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 9_000);
  // Not before its time: the claim finds nothing until the 10 s have passed.
  expect(await claimNextImport(imports, new Date())).toBeNull();

  const second = await claim(new Date(Date.now() + 11_000));
  await run(second, extractFails);
  const afterSecond = await imports.findOne({ _id });
  expect(afterSecond?.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 59_000);

  const third = await claim(new Date(Date.now() + 61_000));
  await run(third, extractFails);
  expect(await imports.findOne({ _id })).toMatchObject({
    status: "failed",
    attempts: 3,
    error: FAILED_MESSAGE,
    noRetry: false,
  });
  expect(await imports.findOne({ _id })).not.toHaveProperty("step");
  expect(await claimNextImport(imports, new Date(Date.now() + 3_600_000))).toBeNull();
});

test("a failure no retry can fix fails the import at once, with its message", async () => {
  const { _id } = await insertImport();
  const notARecipe = () => Promise.reject(new NoRetryError("This doesn't look like a recipe."));

  await run(await claim(), notARecipe);

  expect(await imports.findOne({ _id })).toMatchObject({
    status: "failed",
    attempts: 1,
    error: "This doesn't look like a recipe.",
    noRetry: true,
  });
});

test("an attempt that reaches its deadline is stopped, and tried again", async () => {
  const { _id } = await insertImport();
  // As every call in a real extractor: it gives up when the attempt's deadline passes.
  const extractHangs: Extract = (_, signal) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        reject(new Error("Stopped at the deadline."));
      });
    });

  await run(await claim(), extractHangs, AbortSignal.timeout(10));

  expect(await imports.findOne({ _id })).toMatchObject({ status: "pending", attempts: 1 });
});

test("a job whose worker died on its last try is failed, not tried a fourth time", async () => {
  const { _id } = await insertImport({
    status: "processing",
    attempts: 3,
    leaseUntil: new Date(Date.now() - 1000),
  });
  let tried = false;

  await run(await claim(), () => {
    tried = true;
    return extractNow();
  });

  expect(tried).toBe(false);
  expect(await imports.findOne({ _id })).toMatchObject({
    status: "failed",
    attempts: 4,
    noRetry: false,
  });
});

test("the loop runs waiting jobs, and finishes a job whose worker died", async () => {
  const waiting = await insertImport();
  const crashed = await insertImport({
    status: "processing",
    attempts: 1,
    leaseUntil: new Date(Date.now() - 1000),
  });
  const stop = new AbortController();

  const loop = workLoop({ imports, extract: extractNow, logger, signal: stop.signal });
  for (const { _id } of [waiting, crashed]) {
    await expect.poll(async () => (await imports.findOne({ _id }))?.status).toBe("ready");
  }
  stop.abort();
  await loop;
});

test("the loop goes on after a database error, and runs the job once it can", async () => {
  const { _id } = await insertImport();
  // The first claim fails, as if Mongo were restarting; the next ones reach it.
  const claim = vi
    .spyOn(imports, "findOneAndUpdate")
    .mockRejectedValueOnce(new Error("Mongo is restarting."));
  // Put back even if the test fails: the collection is shared with the tests after it.
  onTestFinished(() => {
    claim.mockRestore();
  });
  const stop = new AbortController();

  const loop = workLoop({ imports, extract: extractNow, logger, signal: stop.signal });
  // It waits a second after the error, as when idle.
  await expect
    .poll(async () => (await imports.findOne({ _id }))?.status, { timeout: 3000 })
    .toBe("ready");
  stop.abort();
  await loop;
});
