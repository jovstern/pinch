import { z } from "zod";
import { TagSchema } from "./tags.ts";

// An optional text field. Forms send "" for a blank input and models often answer "", so an
// empty string means "not set" (design §9): one meaning, stored one way.
function optionalText(max: number, tooLong: string) {
  return z
    .string()
    .trim()
    .max(max, tooLong)
    .transform((text) => (text === "" ? undefined : text))
    .optional();
}

function optionalWholeNumber(min: number, max: number, outOfRange: string) {
  return z.int("Enter a whole number.").min(min, outOfRange).max(max, outOfRange).optional();
}

export const IngredientSchema = z.object({
  name: z.string().trim().min(1, "Name the ingredient.").max(200, "Keep it under 200 characters."),
  // Text, not a number: recipes say "1/2", "2-3" or "a pinch".
  quantity: optionalText(50, "Keep it under 50 characters."),
  unit: optionalText(50, "Keep it under 50 characters."),
  note: optionalText(200, "Keep it under 200 characters."),
});

// What the user writes: the body of POST /api/recipes (design §6). Every limit has a message
// the form can show (§8.1).
export const RecipeInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the recipe a title.")
    .max(200, "Keep the title under 200 characters."),
  description: optionalText(2000, "Keep the description under 2000 characters."),
  ingredients: z
    .array(IngredientSchema)
    .min(1, "Add at least one ingredient.")
    .max(100, "A recipe can have up to 100 ingredients."),
  steps: z
    .array(
      z
        .string()
        .trim()
        .min(1, "A step can't be empty.")
        .max(2000, "Keep each step under 2000 characters."),
    )
    .min(1, "Add at least one step.")
    .max(100, "A recipe can have up to 100 steps."),
  servings: optionalWholeNumber(1, 100, "Servings must be between 1 and 100."),
  prepMinutes: optionalWholeNumber(0, 1440, "Prep time must be between 0 and 1440 minutes."),
  cookMinutes: optionalWholeNumber(0, 1440, "Cook time must be between 0 and 1440 minutes."),
  // Left out means none: toRecipe parses stored recipes with this schema, so ones saved before
  // tags existed read as []. Each tag once (the default comes first, so it's deduped too).
  tags: z
    .array(TagSchema)
    .max(20, "A recipe can have up to 20 tags.")
    .default([])
    .transform((tags) => [...new Set(tags)]),
});

// Per serving, estimated by Gemini from the ingredients (design D14): always an estimate, and
// shown as one. Calories in kcal, the rest in grams. Not in the form: the user doesn't write it (D20).
export const NutritionSchema = z.object({
  calories: z.number().min(0).max(10_000),
  proteinG: z.number().min(0).max(1000),
  carbsG: z.number().min(0).max(1000),
  fatG: z.number().min(0).max(1000),
});

// A field the model was unsure of, or couldn't find in the post, and why: a "thing to look at"
// on the draft (design §6, §9). The path names the field as the API's errors do (§8.1): "title",
// "servings", "prepMinutes", "cookMinutes", "steps.2" or "ingredients.3.quantity" (or .unit,
// .name), counting from 0. A reason too long is cut, not refused: a mark never fails a draft.
export const UncertainFieldSchema = z.object({
  path: z.string(),
  reason: z
    .string()
    .trim()
    .transform((reason) => reason.slice(0, 200)),
});

// The most marks a draft keeps: a few things to look at, not the whole recipe.
export const MAX_UNCERTAIN = 10;

const markablePath =
  /^(?:title|servings|prepMinutes|cookMinutes|steps\.(0|[1-9]\d*)|ingredients\.(0|[1-9]\d*)\.(?:quantity|unit|name))$/;

// Whether a mark's path names a field of this draft: one of the paths above, and a step or an
// ingredient it has.
function markExists(path: string, draft: { steps: unknown[]; ingredients: unknown[] }) {
  const match = markablePath.exec(path);
  if (!match) return false;
  const [, step, ingredient] = match;
  if (step !== undefined) return Number(step) < draft.steps.length;
  if (ingredient !== undefined) return Number(ingredient) < draft.ingredients.length;
  return true;
}

// What the worker makes (§4.1): a recipe as the user would write it, the nutrition estimate,
// which only the model gives, and the fields to look at. Marks are only a hint, so they never
// fail a draft: a list that isn't one (null, a mark without a reason or a path) is dropped
// whole (catch); a mark that names no field of the draft (a path malformed, or past the last
// step), has an empty reason or repeats a field is dropped; and only the first MAX_UNCERTAIN
// are kept. Checked on every parse, so when the worker saves the draft and when the API reads
// it (overwrite: a transform that keeps the type, and the schema an object, so its shape can
// still be read).
export const RecipeDraftSchema = RecipeInputSchema.extend({
  nutritionPerServing: NutritionSchema.optional(),
  uncertain: z.array(UncertainFieldSchema).optional().catch(undefined),
}).overwrite((draft) => {
  if (!draft.uncertain) {
    // catch leaves the key, as undefined: gone, so the database doesn't store it as null.
    const rest = { ...draft };
    delete rest.uncertain;
    return rest;
  }
  const paths = new Set<string>();
  const uncertain = draft.uncertain.filter((mark) => {
    const keep = mark.reason !== "" && !paths.has(mark.path) && markExists(mark.path, draft);
    // Only a kept mark claims its field: a dropped one doesn't hide a good one after it.
    if (keep) paths.add(mark.path);
    return keep;
  });
  return { ...draft, uncertain: uncertain.slice(0, MAX_UNCERTAIN) };
});

// A recipe's (or a draft's) picture, from its post (design §5): its size, so the page keeps
// its place before it loads. The image itself is served apart: GET /api/recipes/:id/thumbnail.
export const ThumbnailSchema = z.object({ width: z.int(), height: z.int() });

export const SourceSchema = z.object({
  type: z.enum(["instagram", "facebook", "youtube", "text", "image", "manual"]),
  // http(s) only: the client renders it as a link, and a javascript: URL would run code.
  url: z.url({ protocol: /^https?$/ }).optional(),
});

// A recipe as the API sends it: the ids and dates are strings (mongodb.md).
export const RecipeSchema = RecipeInputSchema.extend({
  id: z.string(),
  nutritionPerServing: NutritionSchema.optional(),
  thumbnail: ThumbnailSchema.optional(),
  source: SourceSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

// My recipes' Sort and Filters (design §7), as GET /api/recipes and the page's address take them.
// The order: newest first (the default), the least total time first, or by title.
export const RecipeSortSchema = z.enum(
  ["newest", "quickest", "az"],
  "Sort by newest, quickest or az.",
);
// The most minutes a recipe takes, prep and cook together ("30 min or less").
export const TimeLimitSchema = z.enum(["15", "30", "60"], "Pick a time of 15, 30 or 60.");
// Where a recipe came from: the three sites, or written by hand ("manual"). Pasted text and
// screenshots aren't among them (the design's Filters have no place for them).
export const ListSourceSchema = SourceSchema.shape.type.extract(
  ["instagram", "youtube", "facebook", "manual"],
  "Pick a source from the list.",
);

// GET /api/recipes, a page at a time. nextCursor asks for the next page, and is null on the last
// one (design §7).
export const RecipeListSchema = z.object({
  items: z.array(RecipeSchema),
  nextCursor: z.string().nullable(),
});

export type Ingredient = z.infer<typeof IngredientSchema>;
export type RecipeInput = z.infer<typeof RecipeInputSchema>;
export type Nutrition = z.infer<typeof NutritionSchema>;
export type RecipeDraft = z.infer<typeof RecipeDraftSchema>;
export type UncertainField = z.infer<typeof UncertainFieldSchema>;
export type Thumbnail = z.infer<typeof ThumbnailSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type RecipeList = z.infer<typeof RecipeListSchema>;
export type RecipeSort = z.infer<typeof RecipeSortSchema>;
export type TimeLimit = z.infer<typeof TimeLimitSchema>;
export type ListSource = z.infer<typeof ListSourceSchema>;
