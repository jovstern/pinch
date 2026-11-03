import { ImportInputSchema, type ImportList, type Platform } from "@pinch/shared";
import express from "express";
import { ObjectId, type Db } from "mongodb";
import {
  IMPORT_LIFETIME_MS,
  IMPORT_LIST_LIMIT,
  importsCollection,
  toImport,
  type ImportDocument,
} from "../db/imports.ts";
import { HttpError, parseInput } from "../errors.ts";

// Imports turn a link into a draft recipe (design §4). The API only records the job; the worker
// does it. As with recipes, every query filters by ownerId.
export function importsRouter(db: Db) {
  const imports = importsCollection(db);
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
