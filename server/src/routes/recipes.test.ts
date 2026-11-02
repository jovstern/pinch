import { RecipeListSchema, RecipeSchema } from "@pinch/shared";
import { ObjectId } from "mongodb";
import { pino } from "pino";
import request from "supertest";
import { expect, test } from "vitest";
import { z } from "zod";
import { createApp } from "../app.ts";
import { loadConfig } from "../config.ts";
import { createIndexes } from "../db/indexes.ts";
import { findNewestRecipes, recipesCollection } from "../db/recipes.ts";
import { createTestDb } from "../testDb.ts";

const config = loadConfig(process.env);
const db = createTestDb();
// The same indexes as the app's database, so the explain test sees the real plan.
await createIndexes(db);
const app = createApp({ logger: pino({ level: "silent" }), db, devUserId: config.DEV_USER_ID });

const omelette = {
  title: "Omelette",
  ingredients: [{ name: "eggs", quantity: "2" }, { name: "salt" }],
  steps: ["Beat the eggs.", "Cook them in butter."],
  servings: 1,
  tags: ["meal:breakfast", "fit:quick"],
};

test("POST /api/recipes creates a recipe and answers 201 with its location", async () => {
  const response = await request(app).post("/api/recipes").send(omelette);

  expect(response.status).toBe(201);
  // The schema checks the id and dates are there; toEqual then checks nothing else is.
  const { id, createdAt, updatedAt } = RecipeSchema.parse(response.body);
  expect(response.headers.location).toBe(`/api/recipes/${id}`);
  expect(response.body).toEqual({
    ...omelette,
    id,
    source: { type: "manual" },
    createdAt,
    updatedAt,
  });
});

test("GET /api/recipes/:id answers the recipe that was created", async () => {
  const created = await request(app).post("/api/recipes").send(omelette);

  const response = await request(app).get(created.headers.location ?? "");
  expect(response.status).toBe(200);
  expect(response.body).toEqual(created.body);
});

test("POST /api/recipes answers 400 naming each field that is not valid", async () => {
  const response = await request(app)
    .post("/api/recipes")
    .send({ ...omelette, title: "  ", ingredients: [{ name: "" }] });

  expect(response.status).toBe(400);
  expect(response.body).toEqual({
    error: {
      code: "invalid_input",
      message: "Some fields are not valid.",
      fields: { title: "Give the recipe a title.", "ingredients.0.name": "Name the ingredient." },
    },
  });
});

test("an empty optional field is not stored", async () => {
  const response = await request(app)
    .post("/api/recipes")
    .send({ ...omelette, description: "  ", ingredients: [{ name: "eggs", unit: "" }] });

  const { id } = RecipeSchema.parse(response.body);
  const stored = await recipesCollection(db).findOne({ _id: new ObjectId(id) });
  expect(stored).not.toHaveProperty("description");
  expect(stored?.ingredients).toEqual([{ name: "eggs" }]);
});

test("a request without a JSON body answers 400", async () => {
  const response = await request(app).post("/api/recipes");

  expect(response.status).toBe(400);
  expect(response.body).toEqual({
    error: { code: "bad_request", message: "Send the data as a JSON object." },
  });
});

test("a body that is not JSON answers 400", async () => {
  const response = await request(app)
    .post("/api/recipes")
    .set("Content-Type", "application/json")
    .send("{ not json");

  expect(response.status).toBe(400);
  expect(response.body).toEqual({
    error: { code: "bad_request", message: "The request body isn't valid JSON." },
  });
});

// A recipe that belongs to someone else, written straight to the database.
async function insertOtherUsersRecipe() {
  const { insertedId } = await recipesCollection(db).insertOne({
    ...omelette,
    _id: new ObjectId(),
    ownerId: new ObjectId(),
    source: { type: "manual" },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return insertedId.toHexString();
}

test("another user's recipe is not found", async () => {
  const id = await insertOtherUsersRecipe();

  const response = await request(app).get(`/api/recipes/${id}`);
  expect(response.status).toBe(404);
  expect(response.body).toMatchObject({ error: { code: "recipe_not_found" } });
});

test("an id that is not an ObjectId is not found", async () => {
  const response = await request(app).get("/api/recipes/not-an-id");
  expect(response.status).toBe(404);
  expect(response.body).toMatchObject({ error: { code: "recipe_not_found" } });
});

test("GET /api/recipes lists my recipes, newest first", async () => {
  const older = await request(app)
    .post("/api/recipes")
    .send({ ...omelette, title: "Older" });
  const newer = await request(app)
    .post("/api/recipes")
    .send({ ...omelette, title: "Newer" });
  const othersId = await insertOtherUsersRecipe();

  const response = await request(app).get("/api/recipes");
  expect(response.status).toBe(200);
  const ids = RecipeListSchema.parse(response.body).items.map((recipe) => recipe.id);
  // These two are the newest recipes in the database, so they come first.
  expect(ids.slice(0, 2)).toEqual([
    RecipeSchema.parse(newer.body).id,
    RecipeSchema.parse(older.body).id,
  ]);
  expect(ids).not.toContain(othersId);
});

// A user of their own with 120 recipes, three to each millisecond, so pages also split
// recipes created at the same time. The later an id, the older its recipe: a cursor that
// compared ids alone would put them in the wrong order. Every other one is Italian, the rest
// French. Returns the app that acts as them and the recipes, newest first.
async function insertManyRecipes() {
  const ownerId = new ObjectId();
  const start = Date.now();
  const recipes = Array.from({ length: 120 }, (_, i) => ({
    ...omelette,
    _id: new ObjectId(),
    ownerId,
    tags: [i % 2 === 0 ? "cuisine:italian" : "cuisine:french", "meal:dinner"],
    source: { type: "manual" as const },
    createdAt: new Date(start - Math.floor(i / 3)),
    updatedAt: new Date(start),
  }));
  await recipesCollection(db).insertMany(recipes);
  const newestFirst = recipes.toSorted(
    (a, b) =>
      b.createdAt.getTime() - a.createdAt.getTime() ||
      (a._id.toHexString() < b._id.toHexString() ? 1 : -1),
  );
  return {
    ownerId,
    userApp: createApp({
      logger: pino({ level: "silent" }),
      db,
      devUserId: ownerId.toHexString(),
    }),
    newestFirst,
  };
}

test("GET /api/recipes answers pages of 50, and the cursor leads through all of them", async () => {
  const { userApp, newestFirst } = await insertManyRecipes();

  const pages = [];
  let cursor: string | undefined;
  do {
    const response = await request(userApp).get("/api/recipes").query({ cursor });
    const page = RecipeListSchema.parse(response.body);
    pages.push(page.items.map((recipe) => recipe.id));
    cursor = page.nextCursor ?? undefined;
  } while (cursor);

  // Each recipe once, in order: 50, 50, then the last 20 with no cursor after them.
  expect(pages.map((page) => page.length)).toEqual([50, 50, 20]);
  expect(pages.flat()).toEqual(newestFirst.map((recipe) => recipe._id.toHexString()));
});

test("GET /api/recipes answers 400 for a cursor it didn't give", async () => {
  const response = await request(app).get("/api/recipes").query({ cursor: "page-2" });

  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({
    error: { code: "invalid_input", fields: { cursor: "This cursor isn't valid." } },
  });
});

// The parts of explain("executionStats") the test reads; the driver types it as any document.
const ExplainSchema = z.object({
  queryPlanner: z.object({ winningPlan: z.unknown() }),
  executionStats: z.object({ nReturned: z.number(), totalDocsExamined: z.number() }),
});

test("the list's second page reads its index from the cursor on, not the page before (§6)", async () => {
  const { ownerId, newestFirst } = await insertManyRecipes();
  const cursor = newestFirst[49];
  if (!cursor) throw new Error("expected 120 recipes");

  const explain = ExplainSchema.parse(
    await findNewestRecipes(recipesCollection(db), ownerId, { after: cursor }).explain(
      "executionStats",
    ),
  );

  // An index scan in the index's own order (no SORT stage)...
  const plan = JSON.stringify(explain.queryPlanner.winningPlan);
  expect(plan).toContain("IXSCAN");
  expect(plan).not.toMatch(/COLLSCAN|"SORT"/);
  // ...that reads the 51 recipes it answers, not the 50 before them too. (At most 2 more: the
  // cursor's own recipe and one created in the same millisecond, read and dropped; three per
  // millisecond, see insertManyRecipes.)
  expect(explain.executionStats.nReturned).toBe(51);
  expect(explain.executionStats.totalDocsExamined).toBeLessThanOrEqual(53);
});

test("POST /api/recipes keeps each tag once, and answers 400 for a tag not in the lists", async () => {
  const created = await request(app)
    .post("/api/recipes")
    .send({ ...omelette, tags: ["meal:dinner", "meal:dinner"] });
  expect(created.body).toMatchObject({ tags: ["meal:dinner"] });

  const response = await request(app)
    .post("/api/recipes")
    .send({ ...omelette, tags: ["meal:dinner", "cuisine:martian"] });
  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({
    error: { fields: { "tags.1": "Pick a tag from the list." } },
  });
});

test("GET /api/recipes?tags= lists the recipes with every one of the tags, a page at a time", async () => {
  const { userApp, newestFirst } = await insertManyRecipes();
  const italian = newestFirst
    .filter((recipe) => recipe.tags.includes("cuisine:italian"))
    .map((recipe) => recipe._id.toHexString());

  const tags = "cuisine:italian,meal:dinner";
  const first = RecipeListSchema.parse(
    (await request(userApp).get("/api/recipes").query({ tags })).body,
  );
  const cursor = first.nextCursor ?? "";
  const second = RecipeListSchema.parse(
    (await request(userApp).get("/api/recipes").query({ tags, cursor })).body,
  );

  // 60 Italian recipes: 50, then 10.
  expect([...first.items, ...second.items].map((recipe) => recipe.id)).toEqual(italian);
  expect(second.nextCursor).toBeNull();
});

test("GET /api/recipes answers 400 for a tag filter not in the lists", async () => {
  const response = await request(app).get("/api/recipes").query({ tags: "cuisine:martian" });

  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({
    error: { fields: { "tags.0": "Pick a tag from the list." } },
  });
});

test("the list filtered by a tag reads the tags index, only the recipes it answers (§6)", async () => {
  const { ownerId } = await insertManyRecipes();

  const explain = ExplainSchema.parse(
    await findNewestRecipes(recipesCollection(db), ownerId, {
      tags: ["cuisine:italian"],
    }).explain("executionStats"),
  );

  // Half the recipes are Italian: the tags index goes straight to them, in order; the other
  // index would read the French ones too and drop them.
  const plan = JSON.stringify(explain.queryPlanner.winningPlan);
  expect(plan).toContain('"indexName":"ownerId_1_tags_1_createdAt_-1__id_-1"');
  expect(plan).not.toMatch(/COLLSCAN|"SORT"/);
  expect(explain.executionStats).toMatchObject({ nReturned: 51, totalDocsExamined: 51 });
});

test("PUT /api/recipes/:id replaces what the user can edit and clears what they left out", async () => {
  const created = await request(app)
    .post("/api/recipes")
    .send({ ...omelette, description: "Quick" });
  const before = RecipeSchema.parse(created.body);

  const edited = { title: "Herb omelette", ingredients: [{ name: "eggs" }], steps: ["Cook."] };
  const response = await request(app).put(`/api/recipes/${before.id}`).send(edited);

  expect(response.status).toBe(200);
  const after = RecipeSchema.parse(response.body);
  expect(response.body).toEqual({
    ...edited,
    tags: [],
    id: before.id,
    source: before.source,
    createdAt: before.createdAt,
    updatedAt: after.updatedAt,
  });
  const read = await request(app).get(`/api/recipes/${before.id}`);
  expect(read.body).toEqual(response.body);
});

test("PUT /api/recipes/:id answers 400 for invalid input", async () => {
  const created = await request(app).post("/api/recipes").send(omelette);
  const { id } = RecipeSchema.parse(created.body);

  const response = await request(app)
    .put(`/api/recipes/${id}`)
    .send({ ...omelette, steps: [] });
  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({ error: { fields: { steps: "Add at least one step." } } });
});

test("PUT on another user's recipe is not found and changes nothing", async () => {
  const id = await insertOtherUsersRecipe();

  const response = await request(app)
    .put(`/api/recipes/${id}`)
    .send({ ...omelette, title: "Mine now" });
  expect(response.status).toBe(404);
  const stored = await recipesCollection(db).findOne({ _id: new ObjectId(id) });
  expect(stored?.title).toBe("Omelette");
});

test("DELETE /api/recipes/:id answers 204 and the recipe is gone", async () => {
  const created = await request(app).post("/api/recipes").send(omelette);
  const { id } = RecipeSchema.parse(created.body);

  const response = await request(app).delete(`/api/recipes/${id}`);
  expect(response.status).toBe(204);
  expect((await request(app).get(`/api/recipes/${id}`)).status).toBe(404);
});

test("DELETE on another user's recipe is not found and keeps it", async () => {
  const id = await insertOtherUsersRecipe();

  const response = await request(app).delete(`/api/recipes/${id}`);
  expect(response.status).toBe(404);
  expect(await recipesCollection(db).countDocuments({ _id: new ObjectId(id) })).toBe(1);
});
