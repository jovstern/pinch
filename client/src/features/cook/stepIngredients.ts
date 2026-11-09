import type { Ingredient } from "@pinch/shared";

// The ingredients a step uses, by their place in the recipe's list, so cook mode can show them
// beside the step (docs/ux/plan.md U2). Steps name their ingredients in words, not by link, so
// it's a guess: an ingredient is in a step that names it, or names its last word ("olive oil"
// in "add the oil"). A miss costs little: the full list is a tap away.
export function stepIngredients(step: string, ingredients: Ingredient[]): number[] {
  return ingredients.flatMap((ingredient, index) => {
    const name = ingredient.name.trim();
    const lastWord = name.split(/\s+/).at(-1) ?? name;
    return names(name).test(step) || names(lastWord).test(step) ? [index] : [];
  });
}

// The word where a word starts, so "oil" isn't found in "boil", in any case; it may end the
// word ("eggs" for "egg"). Hebrew joins up to two letters to the front of a word ("ו", "ה",
// "ב", "ל", "מ", "ש", "כ": "והקמח" is "and the flour"), so those may come before it.
function names(word: string) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<!\\p{L})[והבלמשכ]{0,2}${escaped}`, "iu");
}
