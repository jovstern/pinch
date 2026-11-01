import { RecipeListSchema, RecipeSchema } from "@pinch/shared";
import { ObjectId } from "mongodb";
import { pino } from "pino";
import request from "supertest";
import { expect, test } from "vitest";
import { createApp } from "../app.ts";
import { loadConfig } from "../config.ts";
import { recipesCollection } from "../db/recipes.ts";
import { createTestDb } from "../testDb.ts";

const config = loadConfig(process.env);
const db = createTestDb();
const app = createApp({ logger: pino({ level: "silent" }), db, devUserId: config.DEV_USER_ID });

const omelette = {
  title: "Omelette",
  ingredients: [{ name: "eggs", quantity: "2" }, { name: "salt" }],
  steps: ["Beat the eggs.", "Cook them in butter."],
  servings: 1,
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
  expect(ids.indexOf(RecipeSchema.parse(newer.body).id)).toBeLessThan(
    ids.indexOf(RecipeSchema.parse(older.body).id),
  );
  expect(ids).not.toContain(othersId);
});

test("GET /api/recipes answers at most 50 recipes", async () => {
  for (let i = 0; i < 51; i++) await request(app).post("/api/recipes").send(omelette);

  const response = await request(app).get("/api/recipes");
  expect(RecipeListSchema.parse(response.body)).toMatchObject({ nextCursor: null });
  expect(RecipeListSchema.parse(response.body).items).toHaveLength(50);
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
  const stored = await recipesCollection(db).findOne({
    _id: new ObjectId(id),
  });
  expect(stored?.title).toBe("Omelette");
});

test("DELETE /api/recipes/:id answers 204 and the recipe is gone", async () => {
  const created = await request(app).post("/api/recipes").send(omelette);
  const url = created.headers.location ?? "";

  const response = await request(app).delete(url);
  expect(response.status).toBe(204);
  expect((await request(app).get(url)).status).toBe(404);
});

test("DELETE on another user's recipe is not found and keeps it", async () => {
  const id = await insertOtherUsersRecipe();

  const response = await request(app).delete(`/api/recipes/${id}`);
  expect(response.status).toBe(404);
  expect(await recipesCollection(db).countDocuments({ _id: new ObjectId(id) })).toBe(1);
});
