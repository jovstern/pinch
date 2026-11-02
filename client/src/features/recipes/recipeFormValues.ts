import type { Recipe } from "@pinch/shared";

// The form's values and how they map to and from a recipe. Apart from RecipeForm, so the pages
// can use them without loading the form and its library (LazyRecipeForm).

// What the inputs hold: text, even the numbers, so whatever the user typed stays as typed.
export type RecipeFormValues = {
  title: string;
  description: string;
  ingredients: { quantity: string; unit: string; name: string; note: string }[];
  steps: string[];
  servings: string;
  prepMinutes: string;
  cookMinutes: string;
};

export const emptyIngredient = { quantity: "", unit: "", name: "", note: "" };

export const emptyRecipe: RecipeFormValues = {
  title: "",
  description: "",
  ingredients: [emptyIngredient],
  steps: [""],
  servings: "",
  prepMinutes: "",
  cookMinutes: "",
};

// A saved recipe, as the inputs show it: what it doesn't set is a blank input.
export function toFormValues(recipe: Recipe): RecipeFormValues {
  return {
    title: recipe.title,
    description: recipe.description ?? "",
    ingredients: recipe.ingredients.map((ingredient) => ({
      quantity: ingredient.quantity ?? "",
      unit: ingredient.unit ?? "",
      name: ingredient.name,
      note: ingredient.note ?? "",
    })),
    steps: recipe.steps,
    servings: toText(recipe.servings),
    prepMinutes: toText(recipe.prepMinutes),
    cookMinutes: toText(recipe.cookMinutes),
  };
}

// What the API takes. The schema trims text and drops blank optional fields (design §9); the
// numbers are typed as text, so they're turned into numbers here ("abc" fails as not whole).
export function toInput(values: RecipeFormValues) {
  return {
    ...values,
    servings: toNumber(values.servings),
    prepMinutes: toNumber(values.prepMinutes),
    cookMinutes: toNumber(values.cookMinutes),
  };
}

function toText(number: number | undefined) {
  return number === undefined ? "" : String(number);
}

function toNumber(text: string) {
  return text.trim() === "" ? undefined : Number(text);
}
