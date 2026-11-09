import type { ImportStep, RecipeDraft } from "@pinch/shared";
import { setTimeout } from "node:timers/promises";
import sharp from "sharp";
import type { ImportDocument } from "../db/imports.ts";
import type { StoredThumbnail } from "../db/thumbnail.ts";
import { shrink } from "./thumbnail.ts";

// Stands in for Gemini (EXTRACTOR=fake): the queue was built with it in M4, without AI (design
// §12), and e2e runs with it, so no test calls Gemini. It takes a few seconds, as the real one
// does, and makes the same draft for every link, except one with "fail" in it: that one fails
// every try, to show retries and a failed import. A link gets a picture: a plain tile in the
// reel's shape (9:16), made here, so nothing is fetched.
export async function fakeExtract(
  input: ImportDocument["input"],
  signal: AbortSignal,
  setStep: (step: ImportStep) => Promise<void>,
  setThumbnail: (thumbnail: StoredThumbnail) => Promise<void>,
): Promise<RecipeDraft> {
  // The steps as the real one goes through them: a link is fetched first, a text isn't. Stops
  // at the attempt's deadline, as every call in a real extractor must (§4.3).
  if (input.type === "link") {
    await setStep("fetching");
    await setTimeout(1500, undefined, { signal });
    const tile = sharp({
      create: { width: 1080, height: 1920, channels: 3, background: "#c8471b" },
    });
    await setThumbnail(await shrink(await tile.png().toBuffer()));
  }
  await setStep("analyzing");
  await setTimeout(1500, undefined, { signal });
  // Screenshots have no words to say "fail" with: they always make the draft.
  const sent = input.type === "link" ? input.url : input.type === "text" ? input.text : "";
  if (sent.includes("fail")) throw new Error("The fake extractor fails this one on purpose.");
  const from =
    input.type === "link" ? input.platform : input.type === "text" ? "text" : "screenshots";
  return {
    title: `Tomato pasta (from ${from})`,
    ingredients: [
      { name: "spaghetti", quantity: "200", unit: "g" },
      { name: "tomatoes", quantity: "400", unit: "g", note: "crushed" },
      { name: "garlic", quantity: "2", unit: "cloves" },
    ],
    steps: ["Boil the spaghetti.", "Simmer the garlic and tomatoes; toss with the pasta."],
    servings: 2,
    cookMinutes: 20,
    tags: ["cuisine:italian", "meal:dinner"],
    nutritionPerServing: { calories: 520, proteinG: 18, carbsG: 92, fatG: 8 },
  };
}
