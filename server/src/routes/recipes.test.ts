import { RecipeSchema } from "@pinch/shared";
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

test("a body that is not JSON answers 400", async () => {
  const response = await request(app)
    .post("/api/recipes")
    .set("Content-Type", "application/json")
    .send("{ not json");

  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({ error: { code: "bad_request" } });
});

test("another user's recipe is not found", async () => {
  const { insertedId } = await recipesCollection(db).insertOne({
    ...omelette,
    _id: new ObjectId(),
    ownerId: new ObjectId(),
    source: { type: "manual" },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const response = await request(app).get(`/api/recipes/${insertedId.toHexString()}`);
  expect(response.status).toBe(404);
  expect(response.body).toMatchObject({ error: { code: "recipe_not_found" } });
});

test("an id that is not an ObjectId is not found", async () => {
  const response = await request(app).get("/api/recipes/not-an-id");
  expect(response.status).toBe(404);
  expect(response.body).toMatchObject({ error: { code: "recipe_not_found" } });
});
