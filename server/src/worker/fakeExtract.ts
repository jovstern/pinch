import type { RecipeInput } from "@pinch/shared";
import { setTimeout } from "node:timers/promises";
import type { ImportDocument } from "../db/imports.ts";

// Stands in for Gemini until M5, so the queue is built and tested without AI (design §12). It
// takes a few seconds, as the real one does, and makes the same draft for every link.
export async function fakeExtract(input: ImportDocument["input"]): Promise<RecipeInput> {
  await setTimeout(3000);
  return {
    title: `Tomato pasta (from ${input.platform})`,
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
