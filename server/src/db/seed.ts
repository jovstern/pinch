import { RecipeInputSchema, type RecipeInput } from "@pinch/shared";
import { ObjectId, type Db } from "mongodb";
import { recipesCollection } from "./recipes.ts";

// Sample recipes, so the list, search and tag filters have something to find (design §6). Two
// share a word ("lentils"), and one is in Hebrew, which the text index matches by whole word.
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

// Adds the samples that aren't there, for this owner. Each has a fixed id ("5eed" and its
// number), and $setOnInsert writes only when the upsert inserts: running it again changes
// nothing, and a sample the user edited stays edited (mongodb.md: the seed is idempotent).
export async function seedRecipes(db: Db, ownerId: ObjectId) {
  const now = Date.now();
  const result = await recipesCollection(db).bulkWrite(
    sampleRecipes.map((sample, index) => {
      // A minute apart, so the list shows them in this order.
      const createdAt = new Date(now - index * 60_000);
      return {
        updateOne: {
          filter: { _id: new ObjectId(`5eed${String(index).padStart(20, "0")}`) },
          update: {
            $setOnInsert: {
              // Parsed like a POST body, so a sample with a typo in a tag fails here.
              ...RecipeInputSchema.parse(sample),
              ownerId,
              source: { type: "manual" as const },
              createdAt,
              updatedAt: createdAt,
            },
          },
          upsert: true,
        },
      };
    }),
  );
  return result.upsertedCount;
}
