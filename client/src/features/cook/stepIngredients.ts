import type { Ingredient } from "@pinch/shared";

// The ingredients a step uses, by their place in the recipe's list, so cook mode can show them
// beside the step (docs/ux/plan.md U2). Steps name their ingredients in words, not by link, so
// it's a guess: an ingredient is in a step that names it, or names its noun ("olive oil" in
// "add the oil"). When one is named whole, others with the same noun are left out: "50 גרם חמאה
// מומסת" (melted butter) is named, so "חמאה לטיגון" (butter for frying) isn't meant. A miss
// costs little: the full list is a tap away.
export function stepIngredients(step: string, ingredients: Ingredient[]): number[] {
  const named = ingredients.map((ingredient) => {
    const name = ingredient.name.trim();
    const words = name.split(/\s+/);
    // The noun: last in English ("olive oil"), first in Hebrew ("שמן זית", oil olive).
    const noun = (/\p{Script=Hebrew}/u.test(name) ? words[0] : words.at(-1)) ?? name;
    return {
      noun: noun.toLowerCase(),
      whole: wordStart(name).test(step),
      byNoun: wordStart(noun).test(step),
    };
  });
  const nounsNamedWhole = new Set(named.filter((one) => one.whole).map((one) => one.noun));
  return named.flatMap((one, index) =>
    one.whole || (one.byNoun && !nounsNamedWhole.has(one.noun)) ? [index] : [],
  );
}

// The word where a word starts, so "oil" isn't found in "boil", in any case. It may go on
// ("egg" is found in "eggs", and in "eggplant": an extra row costs little). Hebrew joins up to
// two letters to the front of a word ("ו", "ה", "ב", "ל", "מ", "ש", "כ": "והקמח" is "and the
// flour"), so those may come before it.
// A name of several words is found with each word taking a prefix: Hebrew writes "the melted
// butter" as "החמאה המומסת", with a ה on both.
function wordStart(name: string) {
  const words = name.split(/\s+/).map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`(?:^|[^\\p{L}])${words.map((word) => `${PREFIX}${word}`).join("\\s+")}`, "iu");
}

const PREFIX = "[והבלמשכ]{0,2}";
