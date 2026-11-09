import type { Ingredient } from "@pinch/shared";

// The ingredients a step uses, by their place in the recipe's list, so cook mode can show them
// beside the step (docs/ux/plan.md U2). Steps name their ingredients in words, not by link, so
// it's a guess: an ingredient is in a step that names it, or names its noun ("olive oil" in
// "add the oil"). A miss costs little: the full list is a tap away.
export function stepIngredients(step: string, ingredients: Ingredient[]): number[] {
  return ingredients.flatMap((ingredient, index) => {
    const name = ingredient.name.trim();
    const words = name.split(/\s+/);
    // The noun: last in English ("olive oil"), first in Hebrew ("שמן זית", oil olive).
    const noun = (/\p{Script=Hebrew}/u.test(name) ? words[0] : words.at(-1)) ?? name;
    return wordStart(name).test(step) || wordStart(noun).test(step) ? [index] : [];
  });
}

// The word where a word starts, so "oil" isn't found in "boil", in any case. It may go on
// ("egg" is found in "eggs", and in "eggplant": an extra row costs little). Hebrew joins up to
// two letters to the front of a word ("ו", "ה", "ב", "ל", "מ", "ש", "כ": "והקמח" is "and the
// flour"), so those may come before it.
function wordStart(word: string) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^\\p{L}])[והבלמשכ]{0,2}${escaped}`, "iu");
}
