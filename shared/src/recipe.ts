import { z } from "zod";
import { messages } from "./messages.ts";
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
  return z.int(messages.wholeNumber).min(min, outOfRange).max(max, outOfRange).optional();
}

export const IngredientSchema = z.object({
  name: z.string().trim().min(1, messages.ingredientNameRequired).max(200, messages.under200),
  // Text, not a number: recipes say "1/2", "2-3" or "a pinch".
  quantity: optionalText(50, messages.under50),
  unit: optionalText(50, messages.under50),
  note: optionalText(200, messages.under200),
});

// What the user writes: the body of POST /api/recipes (design §6). Every limit has a message
// the form can show (§8.1).
export const RecipeInputSchema = z.object({
  title: z.string().trim().min(1, messages.titleRequired).max(200, messages.titleTooLong),
  description: optionalText(2000, messages.descriptionTooLong),
  ingredients: z
    .array(IngredientSchema)
    .min(1, messages.ingredientsRequired)
    .max(100, messages.tooManyIngredients),
  steps: z
    .array(z.string().trim().min(1, messages.stepEmpty).max(2000, messages.stepTooLong))
    .min(1, messages.stepsRequired)
    .max(100, messages.tooManySteps),
  servings: optionalWholeNumber(1, 100, messages.servingsRange),
  prepMinutes: optionalWholeNumber(0, 1440, messages.prepRange),
  cookMinutes: optionalWholeNumber(0, 1440, messages.cookRange),
  // Left out means none: toRecipe parses stored recipes with this schema, so ones saved before
  // tags existed read as []. Each tag once (the default comes first, so it's deduped too).
  tags: z
    .array(TagSchema)
    .max(20, messages.tooManyTags)
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

// A recipe's face when it has no picture (design D25): one emoji for the dish, which the model
// picks. Only a hint, as the marks below, so it never fails a draft or a recipe: anything but
// one emoji (two, a word, "", not a string) is dropped, as if it weren't there. One emoji is one
// grapheme, which a ZWJ sequence or a skin tone still is, and pictographic (so a flag or a keycap
// is dropped too); the length cap keeps out a "grapheme" padded with a thousand combining marks.
export const EmojiSchema = z
  .string()
  .trim()
  .transform((text) => (isOneEmoji(text) ? text : undefined))
  .optional()
  .catch(undefined);

// Older browsers (Firefox before 125) have no Segmenter. There every emoji is dropped rather than
// thrown: catch doesn't catch what a transform throws, and a throw would fail the whole list.
const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter() : undefined;

function isOneEmoji(text: string) {
  if (!segmenter) return false;
  const graphemes = [...segmenter.segment(text)];
  return text.length <= 16 && graphemes.length === 1 && /\p{Extended_Pictographic}/u.test(text);
}

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
  emoji: EmojiSchema,
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
  emoji: EmojiSchema,
  thumbnail: ThumbnailSchema.optional(),
  source: SourceSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

// My recipes' Sort and Filters (design §7), as GET /api/recipes and the page's address take them.
// The order: newest first (the default), the least total time first, or by title.
export const RecipeSortSchema = z.enum(["newest", "quickest", "az"], messages.sort);
// The most minutes a recipe takes, prep and cook together ("30 min or less").
export const TimeLimitSchema = z.enum(["15", "30", "60"], messages.time);
// Where a recipe came from: the three sites, or written by hand ("manual"). Pasted text and
// screenshots aren't among them (the design's Filters have no place for them).
export const ListSourceSchema = SourceSchema.shape.type.extract(
  ["instagram", "youtube", "facebook", "manual"],
  messages.source,
);

// GET /api/recipes, a page at a time. nextCursor asks for the next page, and is null on the last
// one (design §7).
export const RecipeListSchema = z.object({
  items: z.array(RecipeSchema),
  nextCursor: z.string().nullable(),
});

// GET /api/recipes/count: how many recipes the user has (the My recipes tab, design §14).
export const RecipeCountSchema = z.object({ count: z.number().int().nonnegative() });

export type Ingredient = z.infer<typeof IngredientSchema>;
export type RecipeInput = z.infer<typeof RecipeInputSchema>;
export type Nutrition = z.infer<typeof NutritionSchema>;
export type RecipeDraft = z.infer<typeof RecipeDraftSchema>;
export type UncertainField = z.infer<typeof UncertainFieldSchema>;
export type Thumbnail = z.infer<typeof ThumbnailSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type RecipeCount = z.infer<typeof RecipeCountSchema>;
export type RecipeList = z.infer<typeof RecipeListSchema>;
export type RecipeSort = z.infer<typeof RecipeSortSchema>;
export type TimeLimit = z.infer<typeof TimeLimitSchema>;
export type ListSource = z.infer<typeof ListSourceSchema>;
