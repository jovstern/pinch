import { RecipeListSchema, RecipeSchema } from "@pinch/shared";
import { ObjectId } from "mongodb";
import { pino } from "pino";
import request from "supertest";
import { expect, test } from "vitest";
import { z } from "zod";
import { createApp } from "../app.ts";
import { loadConfig } from "../config.ts";
import { createIndexes } from "../db/indexes.ts";
import { findRecipes, recipesCollection, type RecipeDocument } from "../db/recipes.ts";
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
    await findRecipes(recipesCollection(db), ownerId, {
      after: { value: cursor.createdAt, _id: cursor._id },
    }).explain("executionStats"),
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

test("the list filtered by tags reads the tags index, only the recipes it answers (§6)", async () => {
  const { ownerId } = await insertManyRecipes();

  const explain = ExplainSchema.parse(
    await findRecipes(recipesCollection(db), ownerId, {
      tags: ["cuisine:italian", "meal:dinner"],
    }).explain("executionStats"),
  );

  // Every recipe is a dinner and half are Italian. The scan starts at the first tag, so it goes
  // straight to the Italian ones, in order, and checks "dinner" on each. (In the other order it
  // would read the French dinners too and drop them: 101 read; design §7.)
  const plan = JSON.stringify(explain.queryPlanner.winningPlan);
  expect(plan).toContain('"indexName":"ownerId_1_tags_1_createdAt_-1__id_-1"');
  expect(plan).not.toMatch(/COLLSCAN|"SORT"/);
  expect(explain.executionStats).toMatchObject({ nReturned: 51, totalDocsExamined: 51 });
});

// A user of their own with three recipes, oldest first, written straight to the database.
// Returns the app that acts as them and their id.
async function insertSearchableRecipes() {
  const ownerId = new ObjectId();
  const userApp = createApp({
    logger: pino({ level: "silent" }),
    db,
    devUserId: ownerId.toHexString(),
  });
  const recipes = [
    { title: "Egg salad", ingredients: [{ name: "egg" }, { name: "mayonnaise" }] },
    {
      title: "Shakshuka",
      ingredients: [{ name: "eggs" }, { name: "tomatoes" }],
      tags: ["meal:breakfast"],
    },
    { title: "Tomato soup", ingredients: [{ name: "tomatoes" }] },
  ];
  const start = Date.now();
  await recipesCollection(db).insertMany(
    recipes.map((recipe, i) => ({
      tags: [],
      ...recipe,
      steps: ["Cook."],
      _id: new ObjectId(),
      ownerId,
      source: { type: "manual" as const },
      createdAt: new Date(start + i),
      updatedAt: new Date(start + i),
    })),
  );
  return { ownerId, userApp };
}

test("GET /api/recipes?q= finds my recipes by title and ingredient, the best match first", async () => {
  const { userApp } = await insertSearchableRecipes();

  const response = await request(userApp).get("/api/recipes").query({ q: "eggs" });

  // "eggs" finds "egg" too (stemming). Egg salad matches in the title and an ingredient, so it
  // comes first. The other tests' omelettes (eggs too) belong to the default user, not this one.
  const list = RecipeListSchema.parse(response.body);
  expect(list.items.map((recipe) => recipe.title)).toEqual(["Egg salad", "Shakshuka"]);
  expect(list.nextCursor).toBeNull();
});

test("a blank search lists my recipes as usual", async () => {
  const { userApp } = await insertSearchableRecipes();

  const response = await request(userApp).get("/api/recipes").query({ q: "  " });

  const titles = RecipeListSchema.parse(response.body).items.map((recipe) => recipe.title);
  expect(titles).toEqual(["Tomato soup", "Shakshuka", "Egg salad"]);
});

test("GET /api/recipes?q=&tags= finds the matches that have the tags", async () => {
  const { userApp } = await insertSearchableRecipes();

  const response = await request(userApp)
    .get("/api/recipes")
    .query({ q: "egg", tags: "meal:breakfast" });

  const titles = RecipeListSchema.parse(response.body).items.map((recipe) => recipe.title);
  expect(titles).toEqual(["Shakshuka"]);
});

test("GET /api/recipes answers 400 for a search over 200 characters", async () => {
  const response = await request(app)
    .get("/api/recipes")
    .query({ q: "egg ".repeat(51) });

  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({
    error: { fields: { q: "Keep the search under 200 characters." } },
  });
});

test("a search reads the text index, not the whole collection (§6)", async () => {
  const { ownerId } = await insertSearchableRecipes();

  // When Mongo can't run the whole pipeline as one query, explain puts the query's own plan in
  // its first stage; either shape will do.
  const result = await findRecipes(recipesCollection(db), ownerId, { q: "tomato" }).explain(
    "executionStats",
  );
  const explain = z
    .union([
      ExplainSchema,
      z
        .object({ stages: z.tuple([z.object({ $cursor: ExplainSchema })], z.unknown()) })
        .transform(({ stages }) => stages[0].$cursor),
    ])
    .parse(result);

  // Only the two matches are read.
  const plan = JSON.stringify(explain.queryPlanner.winningPlan);
  expect(plan).toContain('"indexName":"ownerId_1_title_text_ingredients.name_text"');
  expect(plan).not.toContain("COLLSCAN");
  expect(explain.executionStats).toMatchObject({ nReturned: 2, totalDocsExamined: 2 });
});

// A user of their own with these recipes, written straight to the database, the first the
// oldest. Returns the app that acts as them and their id.
async function insertRecipesOfNewUser(recipes: Partial<RecipeDocument>[]) {
  const ownerId = new ObjectId();
  const start = Date.now();
  await recipesCollection(db).insertMany(
    recipes.map((recipe, i) => ({
      ...omelette,
      _id: new ObjectId(),
      ownerId,
      source: { type: "manual" as const },
      createdAt: new Date(start + i),
      updatedAt: new Date(start + i),
      ...recipe,
    })),
  );
  const userApp = createApp({
    logger: pino({ level: "silent" }),
    db,
    devUserId: ownerId.toHexString(),
  });
  return { ownerId, userApp };
}

async function listTitles(userApp: typeof app, query: Record<string, string>) {
  const response = await request(userApp).get("/api/recipes").query(query);
  return RecipeListSchema.parse(response.body).items.map((recipe) => recipe.title);
}

test("GET /api/recipes?source= lists the recipes from any of the sources", async () => {
  const { userApp } = await insertRecipesOfNewUser([
    { title: "Reel", source: { type: "instagram", url: "https://www.instagram.com/reel/a" } },
    { title: "Video", source: { type: "youtube", url: "https://youtu.be/a" } },
    { title: "By hand" },
    { title: "Pasted", source: { type: "text" } },
  ]);

  expect(await listTitles(userApp, { source: "instagram,manual" })).toEqual(["By hand", "Reel"]);
});

test("GET /api/recipes?time= lists the recipes that take at most that long, prep and cook together", async () => {
  const { userApp } = await insertRecipesOfNewUser([
    { title: "Both, 30", prepMinutes: 10, cookMinutes: 20 },
    { title: "Both, 31", prepMinutes: 11, cookMinutes: 20 },
    { title: "Cook only, 25", cookMinutes: 25 },
    { title: "Prep only, 5", prepMinutes: 5 },
    { title: "No time" },
  ]);

  // A recipe with no time isn't known to be quick, so a time filter leaves it out.
  expect(await listTitles(userApp, { time: "30" })).toEqual([
    "Prep only, 5",
    "Cook only, 25",
    "Both, 30",
  ]);
});

test("GET /api/recipes?sort=quickest lists the least total time first, and no time last", async () => {
  const { userApp } = await insertRecipesOfNewUser([
    { title: "No time" },
    { title: "40", prepMinutes: 10, cookMinutes: 30 },
    { title: "5", prepMinutes: 5 },
    { title: "20", cookMinutes: 20 },
  ]);

  expect(await listTitles(userApp, { sort: "quickest" })).toEqual(["5", "20", "40", "No time"]);
});

test("GET /api/recipes?sort=az lists by title, whatever the case", async () => {
  const { userApp } = await insertRecipesOfNewUser([
    { title: "banana bread" },
    { title: "Apple pie" },
    { title: "Carrot cake" },
  ]);

  expect(await listTitles(userApp, { sort: "az" })).toEqual([
    "Apple pie",
    "banana bread",
    "Carrot cake",
  ]);
});

test("the cursor leads through every page of each order, each recipe once", async () => {
  // 240 recipes; many share a time or a title (some only by case, which A–Z ignores), so pages
  // split recipes with the same value. Every other one is from Instagram.
  const { userApp } = await insertRecipesOfNewUser(
    Array.from({ length: 240 }, (_, i) => ({
      title: `${i % 2 ? "apple" : "Apple"} ${String(i % 5)}`,
      cookMinutes: i % 4 === 0 ? undefined : i % 9,
      source: { type: i % 2 ? ("instagram" as const) : ("manual" as const) },
    })),
  );

  // Each list and how many recipes it has. Newest also with a time and a source: the 120 from
  // Instagram all have a time, under 10 minutes; the 60 without one are written by hand.
  const lists = [
    { query: { sort: "quickest" }, count: 240 },
    { query: { sort: "az" }, count: 240 },
    { query: { time: "30", source: "instagram" }, count: 120 },
  ];
  for (const { query, count } of lists) {
    const ids = [];
    let cursor: string | undefined;
    do {
      const response = await request(userApp)
        .get("/api/recipes")
        .query({ ...query, cursor });
      const page = RecipeListSchema.parse(response.body);
      ids.push(...page.items.map((recipe) => recipe.id));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(new Set(ids).size).toBe(count);
    expect(ids).toHaveLength(count);
  }
});

test("GET /api/recipes?q=&sort= shows the best matches in the order asked", async () => {
  const { userApp } = await insertSearchableRecipes();

  expect(await listTitles(userApp, { q: "eggs", sort: "az" })).toEqual(["Egg salad", "Shakshuka"]);
});

test("GET /api/recipes answers 400 for a sort, time or source not in the lists", async () => {
  const response = await request(app)
    .get("/api/recipes")
    .query({ sort: "oldest", time: "45", source: "tiktok" });

  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({
    error: {
      fields: {
        sort: "Sort by newest, quickest or az.",
        time: "Pick a time of 15, 30 or 60.",
        "source.0": "Pick a source from the list.",
      },
    },
  });
});

test("GET /api/recipes answers 400 for a cursor from another order", async () => {
  const response = await request(app)
    .get("/api/recipes")
    .query({ sort: "quickest", cursor: `az:Omelette_${new ObjectId().toHexString()}` });

  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({
    error: { fields: { cursor: "This cursor isn't valid." } },
  });
});

test("A–Z reads the title index in order, only the recipes it answers (§6)", async () => {
  const { ownerId } = await insertManyRecipes();

  const explain = ExplainSchema.parse(
    await findRecipes(recipesCollection(db), ownerId, { sort: "az" }).explain("executionStats"),
  );

  const plan = JSON.stringify(explain.queryPlanner.winningPlan);
  expect(plan).toContain('"indexName":"ownerId_1_title_1__id_1"');
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
    // Left out, so cleared (PUT replaces).
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
