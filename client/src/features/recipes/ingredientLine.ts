import type { Ingredient } from "@pinch/shared";

// "2 tbsp olive oil", or just "salt" when the recipe gives no amount. The recipe page and cook
// mode show ingredients the same way.
export function ingredientLine(ingredient: Ingredient) {
  return [ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(" ");
}
