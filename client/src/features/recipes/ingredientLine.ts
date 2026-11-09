import type { Ingredient } from "@pinch/shared";
import { keepRangesTogether } from "./ranges.ts";

// "2 tbsp olive oil", or just "salt" when the recipe gives no amount. The recipe page and cook
// mode show ingredients the same way.
export function ingredientLine(ingredient: Ingredient) {
  const quantity = ingredient.quantity && keepRangesTogether(ingredient.quantity);
  return [quantity, ingredient.unit, ingredient.name].filter(Boolean).join(" ");
}
