import { isTag, type RecipeInput } from "@pinch/shared";

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
  // "facet:value", as the recipe stores them (TagPicker).
  tags: string[];
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
  tags: [],
};

// A saved recipe or an import's draft, as the inputs show it: what it doesn't set is blank.
export function toFormValues(recipe: RecipeInput): RecipeFormValues {
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
    // A tag no longer in the lists (D10) has no chip to untick, and would block Save: dropped.
    tags: recipe.tags.filter(isTag),
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
