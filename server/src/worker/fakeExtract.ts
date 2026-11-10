import type { RecipeDraft } from "@pinch/shared";
import { setTimeout } from "node:timers/promises";
import sharp from "sharp";
import type { ImportDocument } from "../db/imports.ts";
import { shrink } from "./thumbnail.ts";
import type { Attempt } from "./workLoop.ts";

// Stands in for Gemini (EXTRACTOR=fake): the queue was built with it in M4, without AI (design
// §12), and e2e runs with it, so no test calls Gemini. It takes a few seconds, as the real one
// does, and makes the same draft for every link, except one with "fail" in it: that one fails
// every try, to show retries and a failed import. A link gets a picture: a plain tile in the
// reel's shape (9:16), made here, so nothing is fetched; screenshots, their first.
export async function fakeExtract(
  input: ImportDocument["input"],
  signal: AbortSignal,
  { setStep, setThumbnail }: Attempt,
): Promise<RecipeDraft> {
  // Screenshots: the first is the picture, as the real one does.
  if (input.type === "images" && input.images?.[0]) {
    await setThumbnail(await shrink(Buffer.from(input.images[0].buffer)));
  }
  // The steps as the real one goes through them: a link is fetched first, the others aren't. Stops
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
  if (
    (input.type === "link" && input.url.includes("fail")) ||
    (input.type === "text" && input.text.includes("fail"))
  ) {
    throw new Error("The fake extractor fails this one on purpose.");
  }
  return {
    title: `Tomato pasta (from ${input.type === "link" ? input.platform : input.type})`,
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
    emoji: "🍝",
    // Two things to look at, as the model marks them (design §9), so dev and e2e show marks.
    uncertain: [
      { path: "ingredients.1.quantity", reason: "The video says “a can”." },
      { path: "servings", reason: "The video doesn't say how many it serves." },
    ],
  };
}
