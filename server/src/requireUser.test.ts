import { ImportSchema, RecipeSchema } from "@pinch/shared";
import { Binary, ObjectId } from "mongodb";
import { pino } from "pino";
import request from "supertest";
import { expect, test } from "vitest";
import { createApp } from "./app.ts";
import { importsCollection } from "./db/imports.ts";
import { recipesCollection } from "./db/recipes.ts";
import { sessionsCollection } from "./db/sessions.ts";
import { createTestDb } from "./testDb.ts";
import { createTestUser } from "./testUser.ts";

const db = createTestDb();
const app = createApp({ logger: pino({ level: "silent" }), db, secureCookies: false });
const soup = { type: "text", text: "Lentil soup for two: simmer the lentils 20 minutes." };
const mine = { title: "Mine", ingredients: [{ name: "egg" }], steps: ["Fry."], tags: [] };
const signedOut = { error: { code: "signed_out", message: "Log in to continue." } };

test("a recipes route answers 401 signed_out without a session cookie", async () => {
  const response = await request(app).get("/api/recipes");
  expect(response.status).toBe(401);
  expect(response.body).toEqual(signedOut);
});

test("an imports route answers 401 signed_out without a session cookie", async () => {
  const response = await request(app).post("/api/imports").send(soup);
  expect(response.status).toBe(401);
  expect(response.body).toEqual(signedOut);
});

test("a cookie with an unknown or expired token answers 401", async () => {
  const unknown = await request(app).get("/api/recipes").set("Cookie", "pinch_session=nope");
  expect(unknown.status).toBe(401);

  const { userId, cookie } = await createTestUser(db);
  await sessionsCollection(db).updateOne({ userId }, { $set: { expiresAt: new Date(0) } });
  expect((await request(app).get("/api/recipes").set("Cookie", cookie)).status).toBe(401);
});

test("a 401 clears the signed-in hint, so the next page doesn't preload the queue", async () => {
  const response = await request(app).get("/api/imports").set("Cookie", "pinch_signed_in=1");
  expect(response.status).toBe(401);
  expect(String(response.headers["set-cookie"])).toMatch(/^pinch_signed_in=; Path=\/; Expires=/);
});

test("health, ready and auth stay open without a session", async () => {
  expect((await request(app).get("/api/health")).status).toBe(200);
  expect((await request(app).get("/api/ready")).status).toBe(200);
  // me says who's signed in, and no one is: null.
  const me = await request(app).get("/api/auth/me");
  expect(me.status).toBe(200);
  expect(me.body).toBeNull();
  const signup = await request(app)
    .post("/api/auth/signup")
    .send({ email: "open@example.com", password: "a long password", name: "Open" });
  expect(signup.status).toBe(201);
});

test("one user can't read or change another user's recipe or import", async () => {
  const owner = request.agent(app).set("Cookie", (await createTestUser(db)).cookie);
  const other = request.agent(app).set("Cookie", (await createTestUser(db)).cookie);
  const recipe = RecipeSchema.parse((await owner.post("/api/recipes").send(mine)).body);
  const job = ImportSchema.parse((await owner.post("/api/imports").send(soup)).body);
  // Each with a picture, and the import ready: the owner gets them, so a 404 below is the owner's.
  const thumbnail = { width: 1, height: 1, webp: new Binary(Buffer.from("RIFF")) };
  await recipesCollection(db).updateOne({ _id: new ObjectId(recipe.id) }, { $set: { thumbnail } });
  await importsCollection(db).updateOne(
    { _id: new ObjectId(job.id) },
    { $set: { thumbnail, status: "ready" } },
  );

  expect((await other.get(`/api/recipes/${recipe.id}`)).status).toBe(404);
  expect(
    (await other.put(`/api/recipes/${recipe.id}`).send({ ...mine, title: "Theirs" })).status,
  ).toBe(404);
  expect((await other.delete(`/api/recipes/${recipe.id}`)).status).toBe(404);
  expect((await other.post(`/api/recipes/${recipe.id}/restore`)).status).toBe(404);
  expect((await other.get(`/api/recipes/${recipe.id}/thumbnail`)).status).toBe(404);
  expect((await other.get(`/api/imports/${job.id}`)).status).toBe(404);
  expect((await other.get(`/api/imports/${job.id}/thumbnail`)).status).toBe(404);
  expect((await other.post(`/api/imports/${job.id}/approve`).send(mine)).status).toBe(404);
  expect((await other.post(`/api/imports/${job.id}/retry`)).status).toBe(404);
  expect((await other.delete(`/api/imports/${job.id}`)).status).toBe(404);
  // Still the owner's, as they were.
  expect((await owner.get(`/api/recipes/${recipe.id}`)).body).toMatchObject({ title: "Mine" });
  expect((await owner.get(`/api/recipes/${recipe.id}/thumbnail`)).status).toBe(200);
  expect((await owner.get(`/api/imports/${job.id}`)).body).toMatchObject({ status: "ready" });
  expect((await owner.get(`/api/imports/${job.id}/thumbnail`)).status).toBe(200);
});
