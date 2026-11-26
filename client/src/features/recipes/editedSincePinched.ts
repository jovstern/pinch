import type { Recipe } from "@pinch/shared";

// Whether a recipe Pinch read (from a link, pasted text or pictures) was changed after it was
// saved (design D50): saving a draft gives it one date for both, and only an edit that changes
// something moves updatedAt. A recipe written by hand is its writer's own words either way.
export function editedSincePinched(recipe: Recipe) {
  return recipe.source.type !== "manual" && recipe.updatedAt !== recipe.createdAt;
}
