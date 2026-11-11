import { linkKey } from "@pinch/shared";
import type { Db } from "mongodb";
import { importsCollection } from "./imports.ts";
import { recipesCollection } from "./recipes.ts";

// Gives the links and recipes saved before L1 their post's key (design §4.6), so a link pinched
// then is found too. Only the ones without it are read: safe to run again, and a second run
// changes nothing. Says how many of each it changed.
export async function backfillLinkKeys(db: Db) {
  const imports = importsCollection(db);
  const recipes = recipesCollection(db);
  let importsChanged = 0;
  let recipesChanged = 0;

  const links = imports.find(
    { "input.type": "link", linkKey: { $exists: false } },
    { projection: { input: 1 } },
  );
  for await (const job of links) {
    if (job.input.type !== "link") continue;
    await imports.updateOne({ _id: job._id }, { $set: { linkKey: linkKey(job.input.url) } });
    importsChanged++;
  }

  // From a video, with its link: text, screenshots and recipes written by hand have none.
  const fromLinks = recipes.find(
    {
      "source.type": { $in: ["instagram", "facebook", "youtube"] },
      "source.url": { $exists: true },
      "source.linkKey": { $exists: false },
    },
    { projection: { source: 1 } },
  );
  for await (const recipe of fromLinks) {
    if (!recipe.source.url) continue;
    await recipes.updateOne(
      { _id: recipe._id },
      { $set: { "source.linkKey": linkKey(recipe.source.url) } },
    );
    recipesChanged++;
  }

  return { imports: importsChanged, recipes: recipesChanged };
}
