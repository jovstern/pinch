import type { RecipeInput } from "@pinch/shared";
import { setTimeout } from "node:timers/promises";
import type { ImportDocument } from "../db/imports.ts";

// Stands in for Gemini (EXTRACTOR=fake): the queue was built with it in M4, without AI (design
// §12), and e2e runs with it, so no test calls Gemini. It takes a few seconds, as the real one
// does, and makes the same draft for every link, except one with "fail" in it: that one fails
// every try, to show retries and a failed import.
export async function fakeExtract(
  input: ImportDocument["input"],
  signal: AbortSignal,
): Promise<RecipeInput> {
  // Stops at the attempt's deadline, as every call in a real extractor must (§4.3).
  await setTimeout(3000, undefined, { signal });
  const sent = input.type === "link" ? input.url : input.text;
  if (sent.includes("fail")) throw new Error("The fake extractor fails this one on purpose.");
  return {
    title: `Tomato pasta (from ${input.type === "link" ? input.platform : "text"})`,
    ingredients: [
      { name: "spaghetti", quantity: "200", unit: "g" },
      { name: "tomatoes", quantity: "400", unit: "g", note: "crushed" },
      { name: "garlic", quantity: "2", unit: "cloves" },
    ],
    steps: ["Boil the spaghetti.", "Simmer the garlic and tomatoes; toss with the pasta."],
    servings: 2,
    cookMinutes: 20,
    tags: ["cuisine:italian", "meal:dinner"],
  };
}
