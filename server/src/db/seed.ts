import { RecipeInputSchema, type RecipeInput } from "@pinch/shared";
import { ObjectId, type AnyBulkWriteOperation, type Db } from "mongodb";
import { titleEmoji } from "../titleEmoji.ts";
import { recipesCollection, type RecipeDocument } from "./recipes.ts";

// Sample recipes, so the list, search and tag filters have something to find (design §6). Two
// share a word ("lentils"); one is in Hebrew. A sample's place in the list is its id (below):
// add new ones at the end.
export const sampleRecipes: RecipeInput[] = [
  {
    title: "Red lentil soup",
    ingredients: [
      { name: "red lentils", quantity: "1", unit: "cup" },
      { name: "onion", quantity: "1" },
      { name: "carrot", quantity: "2" },
      { name: "cumin", quantity: "1", unit: "tsp" },
    ],
    steps: ["Soften the onion and carrot.", "Add the lentils, cumin and 1 l water; simmer 20 min."],
    servings: 4,
    cookMinutes: 30,
    tags: ["cuisine:middle-eastern", "meal:dinner", "diet:vegan", "fit:weeknight", "fit:healthy"],
  },
  {
    title: "Mujadara",
    ingredients: [
      { name: "brown lentils", quantity: "1", unit: "cup" },
      { name: "rice", quantity: "1", unit: "cup" },
      { name: "onions", quantity: "3", note: "sliced" },
      { name: "olive oil", quantity: "4", unit: "tbsp" },
    ],
    steps: ["Fry the onions in the oil until dark.", "Cook the lentils and rice together."],
    servings: 4,
    cookMinutes: 45,
    tags: ["cuisine:middle-eastern", "meal:dinner", "diet:vegan", "fit:comfort"],
  },
  {
    title: "Spaghetti aglio e olio",
    ingredients: [
      { name: "spaghetti", quantity: "200", unit: "g" },
      { name: "garlic", quantity: "4", unit: "cloves" },
      { name: "olive oil", quantity: "4", unit: "tbsp" },
      { name: "chili flakes", quantity: "1", unit: "pinch" },
    ],
    steps: ["Boil the spaghetti.", "Warm the garlic and chili in the oil; toss with the pasta."],
    servings: 2,
    cookMinutes: 15,
    tags: ["cuisine:italian", "meal:dinner", "diet:vegan", "flavor:spicy", "fit:quick"],
  },
  {
    title: "Margherita pizza",
    ingredients: [
      { name: "pizza dough", quantity: "1", unit: "ball" },
      { name: "tomatoes", quantity: "200", unit: "g", note: "crushed" },
      { name: "mozzarella", quantity: "125", unit: "g" },
      { name: "basil" },
    ],
    steps: ["Stretch the dough and top it.", "Bake at the oven's hottest for 8 min."],
    servings: 2,
    prepMinutes: 15,
    cookMinutes: 8,
    tags: ["cuisine:italian", "meal:dinner", "diet:vegetarian", "fit:party"],
  },
  {
    title: "Pancakes",
    ingredients: [
      { name: "flour", quantity: "1.5", unit: "cups" },
      { name: "milk", quantity: "1.25", unit: "cups" },
      { name: "eggs", quantity: "1" },
      { name: "sugar", quantity: "1", unit: "tbsp" },
    ],
    steps: ["Whisk everything into a smooth batter.", "Fry ladlefuls until bubbles show; flip."],
    servings: 4,
    cookMinutes: 20,
    tags: ["cuisine:american", "meal:breakfast", "diet:vegetarian", "flavor:sweet", "fit:kids"],
  },
  {
    title: "Chicken tacos",
    ingredients: [
      { name: "chicken thighs", quantity: "500", unit: "g" },
      { name: "tortillas", quantity: "8" },
      { name: "lime", quantity: "1" },
      { name: "chili powder", quantity: "2", unit: "tsp" },
    ],
    steps: [
      "Rub the chicken with the chili and grill it.",
      "Slice into the tortillas; squeeze lime.",
    ],
    servings: 4,
    cookMinutes: 20,
    tags: ["cuisine:mexican", "meal:dinner", "flavor:spicy", "fit:weeknight"],
  },
  {
    title: "Chickpea curry",
    ingredients: [
      { name: "chickpeas", quantity: "2", unit: "cans" },
      { name: "coconut milk", quantity: "1", unit: "can" },
      { name: "tomatoes", quantity: "400", unit: "g" },
      { name: "curry paste", quantity: "2", unit: "tbsp" },
    ],
    steps: ["Fry the paste for a minute.", "Add the rest and simmer 20 min."],
    servings: 4,
    cookMinutes: 25,
    tags: ["cuisine:indian", "meal:dinner", "diet:vegan", "fit:meal-prep"],
  },
  {
    title: "Greek salad",
    ingredients: [
      { name: "tomatoes", quantity: "3" },
      { name: "cucumber", quantity: "1" },
      { name: "feta", quantity: "150", unit: "g" },
      { name: "olives", quantity: "1", unit: "handful" },
    ],
    steps: ["Cut the vegetables into chunks.", "Top with the feta and olives; dress with oil."],
    servings: 2,
    prepMinutes: 10,
    tags: ["cuisine:mediterranean", "meal:lunch", "diet:vegetarian", "flavor:fresh", "fit:quick"],
  },
  {
    title: "Chocolate chip cookies",
    ingredients: [
      { name: "butter", quantity: "115", unit: "g", note: "soft" },
      { name: "sugar", quantity: "150", unit: "g" },
      { name: "flour", quantity: "190", unit: "g" },
      { name: "chocolate chips", quantity: "170", unit: "g" },
    ],
    steps: ["Cream the butter and sugar; mix in the rest.", "Bake spoonfuls at 180°C for 10 min."],
    servings: 20,
    cookMinutes: 10,
    tags: ["cuisine:american", "meal:dessert", "flavor:sweet", "fit:kids"],
  },
  {
    title: "סלט ירקות",
    ingredients: [
      { name: "עגבניות", quantity: "3" },
      { name: "מלפפונים", quantity: "2" },
      { name: "בצל", quantity: "1", note: "קטן" },
      { name: "לימון", quantity: "1" },
    ],
    steps: ["לקצוץ את הירקות דק.", "לתבל בלימון, שמן זית ומלח."],
    servings: 4,
    prepMinutes: 10,
    tags: ["cuisine:middle-eastern", "meal:lunch", "diet:parve", "flavor:fresh", "fit:quick"],
  },
];

// Adds the samples that aren't there, as the dev user's (design §8.3). Each has a fixed id, so
// they belong to one owner, and $setOnInsert writes only when the upsert inserts: running it
// again leaves an edited sample as it is and puts back a deleted one (mongodb.md: idempotent).
export async function seedRecipes(db: Db, ownerId: ObjectId) {
  const now = Date.now();
  const writes: AnyBulkWriteOperation<RecipeDocument>[] = sampleRecipes.map((sample, index) => {
    // A minute apart, so the list shows them in this order.
    const createdAt = new Date(now - index * 60_000);
    return {
      updateOne: {
        // "5eed" and the sample's number, padded to an ObjectId's 24 hex digits.
        filter: { _id: new ObjectId(`5eed${String(index).padStart(20, "0")}`) },
        update: {
          $setOnInsert: {
            // Parsed like a POST body, so a sample with a typo in a tag fails here.
            ...RecipeInputSchema.parse(sample),
            emoji: titleEmoji(sample.title),
            ownerId,
            source: { type: "manual" },
            createdAt,
            updatedAt: createdAt,
          },
        },
        upsert: true,
      },
    };
  });
  const result = await recipesCollection(db).bulkWrite(writes);
  return result.upsertedCount;
}
