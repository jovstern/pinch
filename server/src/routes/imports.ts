import {
  DAILY_IMPORT_CAP,
  dailyLimitMessage,
  globalLimitMessage,
  ImportInputSchema,
  linkKey,
  MAX_SCREENSHOT_BYTES,
  MAX_SCREENSHOTS,
  messages,
  RecipeDraftSchema,
  RecipeInputSchema,
  type DuplicateLink,
  type ImportList,
  type Platform,
} from "@pinch/shared";
import express, { type RequestHandler } from "express";
import multer from "multer";
import { ObjectId, type Binary, type Db } from "mongodb";
import {
  findImportOfLink,
  IMPORT_LIFETIME_MS,
  IMPORT_LIST_LIMIT,
  importsCollection,
  toImport,
  type ImportDocument,
} from "../db/imports.ts";
import { isCached, linksCollection } from "../db/links.ts";
import {
  findRecipeOfLink,
  insertRecipeOnce,
  recipesCollection,
  toRecipe,
  type RecipeDocument,
} from "../db/recipes.ts";
import { NOT_DELETED } from "../db/softDelete.ts";
import { WITHOUT_MEDIA } from "../db/thumbnail.ts";
import { countImport, usageCollection } from "../db/usage.ts";
import { HttpError, parseInput } from "../errors.ts";
import { readScreenshot } from "../screenshots.ts";
import { sendThumbnail } from "./thumbnail.ts";

// Imports turn a link, or a post's text, into a draft recipe (design §4). The API only records
// the job; the worker does it. As with recipes, every query filters by ownerId, and every read
// leaves out the deleted ones, kept a while for Undo (D27). globalCap: everyone's imports a day
// (GLOBAL_DAILY_IMPORTS, D30). extractionVersion: the worker's, for the shared cache (§4.6). now:
// the clock the daily caps count days by, and only them (tests pin it); the dates an import or
// recipe is stamped with are the real time.
type ImportsDeps = { globalCap: number; extractionVersion: string; now: () => Date };

export function importsRouter(db: Db, { globalCap, extractionVersion, now }: ImportsDeps) {
  const imports = importsCollection(db);
  const links = linksCollection(db);
  const recipes = recipesCollection(db);
  const usage = usageCollection(db);
  const router = express.Router();

  // 202, not 201: the import is accepted and will be worked on later (§4.1).
  router.post("/", async (req, res) => {
    const sent = parseInput(ImportInputSchema, req.body);
    const key = sent.type === "link" ? linkKey(sent.url) : undefined;
    // Before it's counted: a link the user already has is pointed to, and costs nothing (§4.6).
    if (key) {
      const existing = await pinchedBefore(req.userId, key);
      if (existing) throw linkPinchedBefore(existing);
    }
    // After the input is checked: one refused as invalid doesn't count. A post anyone pinched
    // before is copied by the worker, with no Gemini call, so it's free against both caps (§4.6,
    // D28). Should its answer land just after this, the import costs one call uncounted.
    const free = key !== undefined && (await isCached(links, key, extractionVersion));
    if (!free) await countOrRefuse(req.userId);
    const job = newImport(
      req.userId,
      sent.type === "link" ? { type: "link", url: sent.url, platform: platformOf(sent.url) } : sent,
      key,
    );
    await imports.insertOne(job);
    // A failed import of the same link is done with: pinching again asked for it again, and its
    // Retry would make a second recipe of the post (§4.6). Kept a while, as any deleted (D27).
    if (key) {
      await imports.updateMany(
        { ownerId: req.userId, linkKey: key, status: "failed", ...NOT_DELETED },
        { $set: { deletedAt: new Date() } },
      );
    }
    res.status(202).location(`/api/imports/${job._id.toHexString()}`).json(toImport(job));
  });

  // Screenshots of a post (§1, §4.1): a form with up to 4 images, not JSON. Each is read and
  // made smaller here, so what's kept is known to be an image, and small.
  router.post("/screenshots", receiveScreenshots, async (req, res) => {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) throw invalidScreenshots();
    // One that isn't an image refuses them all, as invalid input. One at a time: each may be
    // a few million pixels to decode.
    const images: Binary[] = [];
    try {
      for (const file of files) images.push(await readScreenshot(file.buffer));
    } catch {
      throw invalidScreenshots();
    }
    await countOrRefuse(req.userId);
    const job = newImport(req.userId, { type: "images", count: images.length, images });
    await imports.insertOne(job);
    res.status(202).location(`/api/imports/${job._id.toHexString()}`).json(toImport(job));
  });

  // Counts one more import, the user's (D22) and everyone's (D30), or refuses it with 429. The
  // user's first: one past their own cap stops there, so it can't use up everyone's. One the global
  // cap refuses still counts as one of the user's: nothing is un-counted (as D22), and both start
  // again at midnight UTC anyway.
  async function countOrRefuse(ownerId: ObjectId) {
    const today = now();
    if (!(await countImport(usage, ownerId, DAILY_IMPORT_CAP, today))) throw dailyLimit();
    if (!(await countImport(usage, "all", globalCap, today))) {
      throw new HttpError(429, "global_limit", globalLimitMessage);
    }
  }

  // What the user already has from this post (§4.6): a recipe first, as that's where it ends up;
  // else an import of it still in the queue, or ready to review. Not one they deleted, nor a failed
  // import: pinching again is asking for it again.
  async function pinchedBefore(ownerId: ObjectId, key: string) {
    const [recipe] = await findRecipeOfLink(recipes, ownerId, key).toArray();
    if (recipe) {
      return { kind: "recipe", id: recipe._id.toHexString(), title: recipe.title } as const;
    }
    const [job] = await findImportOfLink(imports, ownerId, key).toArray();
    // Never a failed one (the query); said again so the type knows.
    if (!job || job.status === "failed") return undefined;
    // Read as the API reads any draft (its marks checked), so the count is the queue's.
    const draft = RecipeDraftSchema.optional().parse(job.draft);
    return {
      kind: "import",
      id: job._id.toHexString(),
      status: job.status,
      title: draft?.title,
      lookAt: draft?.uncertain?.length,
    } as const;
  }

  // Not paged: done imports are deleted and abandoned ones expire, so there are only a few. The
  // cap is a guard, never reached in use (node-api.md: never an unbounded list).
  router.get("/", async (req, res) => {
    const found = await imports
      .find({ ownerId: req.userId, ...NOT_DELETED }, { projection: WITHOUT_MEDIA })
      .sort({ createdAt: -1, _id: -1 })
      .limit(IMPORT_LIST_LIMIT)
      .toArray();
    res.json({ items: found.map(toImport) } satisfies ImportList);
  });

  router.get("/:id", async (req, res) => {
    const job = await imports.findOne(
      { _id: parseId(req.params.id), ownerId: req.userId, ...NOT_DELETED },
      { projection: WITHOUT_MEDIA },
    );
    if (!job) throw importNotFound();
    res.json(toImport(job));
  });

  // The draft's picture (§5), apart from the import, so the list stays small.
  router.get("/:id/thumbnail", async (req, res) => {
    const job = await imports.findOne(
      { _id: parseId(req.params.id), ownerId: req.userId, ...NOT_DELETED },
      { projection: { thumbnail: 1 } },
    );
    // No picture: as good as no import, for an <img>.
    if (!job?.thumbnail) throw importNotFound();
    sendThumbnail(req, res, job.thumbnail);
  });

  // Saves the reviewed draft, as the user edited it, as a recipe, then deletes the import
  // (§4.1). Safe to repeat without a transaction (§4.4, D9): the recipe keeps the import's id
  // under a unique index, so after a crash between the two writes, approving again finds the
  // recipe already made and only deletes the import. Once both writes are done the import is
  // gone, so approving again is a 404: the client keeps the button disabled while it saves.
  router.post("/:id/approve", async (req, res) => {
    const input = parseInput(RecipeInputSchema, req.body);
    const job = await imports.findOne({
      _id: parseId(req.params.id),
      ownerId: req.userId,
      ...NOT_DELETED,
    });
    if (!job) throw importNotFound();
    if (job.status !== "ready") {
      throw new HttpError(409, "import_not_ready", "This import has no draft to save yet.");
    }
    const savedAt = new Date();
    const recipe = await insertRecipeOnce(recipes, {
      ...input,
      _id: new ObjectId(),
      ownerId: req.userId,
      // The model's estimate, not in the form (D14, D20): from the draft (there, as it's ready),
      // never from the body.
      nutritionPerServing: job.draft?.nutritionPerServing,
      // The model's too, as the nutrition (D25).
      emoji: job.draft?.emoji,
      // The worker's, as the nutrition: never from the body (§5).
      thumbnail: job.thumbnail,
      source: sourceOf(job),
      sourceImportId: job._id,
      createdAt: savedAt,
      updatedAt: savedAt,
    });
    await imports.deleteOne({ _id: job._id, ownerId: req.userId });
    res.status(201).location(`/api/recipes/${recipe._id.toHexString()}`).json(toRecipe(recipe));
  });

  // Tries a failed import again, from the start: three more tries, now (§4.2). 202: accepted,
  // the worker will take it again. Attempt numbers, the worker's fence (§4.3), start over too:
  // safe, because each earlier attempt ended at its deadline before the import could fail.
  router.post("/:id/retry", async (req, res) => {
    const filter = { _id: parseId(req.params.id), ownerId: req.userId, ...NOT_DELETED };
    // Checked before it's counted: a retry that can't happen doesn't use one of the day's.
    const found = await imports.findOne(filter);
    if (!found) throw importNotFound();
    if (found.status !== "failed") throw importNotFailed();
    // Not a recipe, too long: it would fail again, and use one of the day's for nothing (D23).
    if (found.noRetry) {
      throw new HttpError(409, "import_no_retry", "This import would fail the same way again.");
    }
    await countOrRefuse(req.userId);
    const retriedAt = new Date();
    const job = await imports.findOneAndUpdate(
      { ...filter, status: "failed" },
      {
        $set: { status: "pending", attempts: 0, nextAttemptAt: retriedAt, updatedAt: retriedAt },
        $unset: { error: "", noRetry: "" },
      },
      { returnDocument: "after", projection: WITHOUT_MEDIA },
    );
    // Changed since it was read (retried in another tab, or deleted).
    if (!job) throw importNotFailed();
    res.status(202).json(toImport(job));
  });

  // Discard a draft, dismiss a failure, or undo Pinch it (§4.2): kept a while, to undo (D27).
  // One still being worked on can go too: the worker's save then finds nothing to update, and
  // does nothing (§4.3), so it never turns ready. Deleting it again is a 404.
  router.delete("/:id", async (req, res) => {
    const { matchedCount } = await imports.updateOne(
      { _id: parseId(req.params.id), ownerId: req.userId, ...NOT_DELETED },
      { $set: { deletedAt: new Date() } },
    );
    if (matchedCount === 0) throw importNotFound();
    res.status(204).end();
  });

  // Undo of a discard or a dismiss: the import is back as it was, a draft to review or a failure
  // to retry. Safe to repeat, as a recipe's. One deleted while the worker had it comes back
  // processing: its attempt saves if it's still running, and if not, the claim takes it again once
  // its lease runs out (§4.3). (The client never restores those: Pinch it's Undo has no Undo.)
  router.post("/:id/restore", async (req, res) => {
    const job = await imports.findOneAndUpdate(
      { _id: parseId(req.params.id), ownerId: req.userId },
      { $unset: { deletedAt: "" } },
      { returnDocument: "after", projection: WITHOUT_MEDIA },
    );
    if (!job) throw importNotFound();
    res.json(toImport(job));
  });

  return router;
}

// Which platform a link is from. The schema has already checked its host is one of them.
function platformOf(url: string): Platform {
  const host = new URL(url).hostname;
  if (host.endsWith("youtube.com") || host === "youtu.be") return "youtube";
  if (host.endsWith("facebook.com") || host === "fb.watch") return "facebook";
  return "instagram";
}

// As in routes/recipes.ts: an id that can't exist is simply not found.
function parseId(id: string) {
  if (!ObjectId.isValid(id)) throw importNotFound();
  return new ObjectId(id);
}

function importNotFailed() {
  return new HttpError(409, "import_not_failed", "Only a failed import can be tried again.");
}

// 409: the user has this link already (§4.6). Not an error to them: the client shows a toast
// pointing to what they have.
function linkPinchedBefore(existing: DuplicateLink["existing"]) {
  return new HttpError(409, "link_pinched_before", "You've pinched this link before.", {
    existing,
  });
}

// 429: too many for today (design §1).
function dailyLimit() {
  return new HttpError(429, "daily_limit", dailyLimitMessage);
}

function importNotFound() {
  return new HttpError(404, "import_not_found", "This import doesn't exist.");
}

// A new import of the user's, waiting for the worker (§4.2); a link's with its post (§4.6).
function newImport(
  ownerId: ObjectId,
  input: ImportDocument["input"],
  linkKey?: string,
): ImportDocument {
  const now = new Date();
  return {
    _id: new ObjectId(),
    ownerId,
    status: "pending",
    input,
    linkKey,
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + IMPORT_LIFETIME_MS),
  };
}

// Where a recipe came from (§6): its link and the post it points to (§4.6), or the text or the
// screenshots ("image") it was made from.
function sourceOf({ input, linkKey }: ImportDocument): RecipeDocument["source"] {
  if (input.type === "link") return { type: input.platform, url: input.url, linkKey };
  if (input.type === "text") return { type: "text" };
  return { type: "image" };
}

// The form's images, in memory (never on disk): at most 4, of 10 MB each, and nothing else (no
// text fields, which multer would otherwise take, any number of them).
const screenshotsUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: MAX_SCREENSHOTS, fileSize: MAX_SCREENSHOT_BYTES, fields: 0 },
}).array("images", MAX_SCREENSHOTS);

// Every error from the upload is the client's: multer's (too many, too big, another field) and
// busboy's (a malformed form). All are a 400, as invalid input. (multer's middleware returns
// nothing to wait for: it calls back; void says so.)
const receiveScreenshots: RequestHandler = (req, res, next) => {
  void screenshotsUpload(req, res, (error: unknown) => {
    next(error ? invalidScreenshots() : undefined);
  });
};

function invalidScreenshots() {
  return new HttpError(400, "invalid_input", "Some fields are not valid.", {
    fields: { images: messages.screenshots },
  });
}
