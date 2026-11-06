import {
  ImportInputSchema,
  RecipeInputSchema,
  type ImportList,
  type Platform,
} from "@pinch/shared";
import express from "express";
import { MongoServerError, ObjectId, type Db } from "mongodb";
import {
  IMPORT_LIFETIME_MS,
  IMPORT_LIST_LIMIT,
  importsCollection,
  toImport,
  type ImportDocument,
} from "../db/imports.ts";
import { recipesCollection, toRecipe, type RecipeDocument } from "../db/recipes.ts";
import { HttpError, parseInput } from "../errors.ts";

// Imports turn a link into a draft recipe (design §4). The API only records the job; the worker
// does it. As with recipes, every query filters by ownerId.
export function importsRouter(db: Db) {
  const imports = importsCollection(db);
  const recipes = recipesCollection(db);
  const router = express.Router();

  // 202, not 201: the import is accepted and will be worked on later (§4.1).
  router.post("/", async (req, res) => {
    const { url } = parseInput(ImportInputSchema, req.body);
    const now = new Date();
    const job: ImportDocument = {
      _id: new ObjectId(),
      ownerId: req.userId,
      status: "pending",
      input: { type: "link", url, platform: platformOf(url) },
      attempts: 0,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + IMPORT_LIFETIME_MS),
    };
    await imports.insertOne(job);
    res.status(202).location(`/api/imports/${job._id.toHexString()}`).json(toImport(job));
  });

  // Not paged: done imports are deleted and abandoned ones expire, so there are only a few. The
  // cap is a guard, never reached in use (node-api.md: never an unbounded list).
  router.get("/", async (req, res) => {
    const found = await imports
      .find({ ownerId: req.userId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(IMPORT_LIST_LIMIT)
      .toArray();
    res.json({ items: found.map(toImport) } satisfies ImportList);
  });

  router.get("/:id", async (req, res) => {
    const job = await imports.findOne({ _id: parseId(req.params.id), ownerId: req.userId });
    if (!job) throw importNotFound();
    res.json(toImport(job));
  });

  // Saves the reviewed draft, as the user edited it, as a recipe, then deletes the import
  // (§4.1). Safe to repeat without a transaction (§4.4, D9): the recipe keeps the import's id
  // under a unique index, so after a crash between the two writes, approving again finds the
  // recipe already made and only deletes the import.
  router.post("/:id/approve", async (req, res) => {
    const input = parseInput(RecipeInputSchema, req.body);
    const job = await imports.findOne({ _id: parseId(req.params.id), ownerId: req.userId });
    if (!job) throw importNotFound();
    if (job.status !== "ready") {
      throw new HttpError(409, "import_not_ready", "This import has no draft to save yet.");
    }
    const now = new Date();
    let recipe: RecipeDocument | null = {
      ...input,
      _id: new ObjectId(),
      ownerId: req.userId,
      source: { type: job.input.platform, url: job.input.url },
      sourceImportId: job._id,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await recipes.insertOne(recipe);
    } catch (error) {
      // 11000 is Mongo's duplicate key: an earlier approve of this import made the recipe.
      if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
      recipe = await recipes.findOne({ sourceImportId: job._id, ownerId: req.userId });
      if (!recipe) throw error;
    }
    await imports.deleteOne({ _id: job._id });
    res.status(201).location(`/api/recipes/${recipe._id.toHexString()}`).json(toRecipe(recipe));
  });

  // Tries a failed import again, from the start: three more tries, now (§4.2). 202, as POST.
  router.post("/:id/retry", async (req, res) => {
    const filter = { _id: parseId(req.params.id), ownerId: req.userId };
    const now = new Date();
    const job = await imports.findOneAndUpdate(
      { ...filter, status: "failed" },
      {
        $set: { status: "pending", attempts: 0, nextAttemptAt: now, updatedAt: now },
        $unset: { error: "" },
      },
      { returnDocument: "after" },
    );
    if (job) {
      res.status(202).json(toImport(job));
      return;
    }
    // Nothing updated: either it isn't failed, or it isn't there.
    if (await imports.findOne(filter)) {
      throw new HttpError(409, "import_not_failed", "Only a failed import can be tried again.");
    }
    throw importNotFound();
  });

  // Discard a draft or dismiss a failure (§4.2). One still being worked on can go too: the
  // worker's save must then find nothing to update, and do nothing (§4.3).
  router.delete("/:id", async (req, res) => {
    const { deletedCount } = await imports.deleteOne({
      _id: parseId(req.params.id),
      ownerId: req.userId,
    });
    if (deletedCount === 0) throw importNotFound();
    res.status(204).end();
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

function importNotFound() {
  return new HttpError(404, "import_not_found", "This import doesn't exist.");
}
