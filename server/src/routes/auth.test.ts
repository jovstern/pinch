import { MeSchema } from "@pinch/shared";
import { pino } from "pino";
import request from "supertest";
import { expect, test } from "vitest";
import { createApp } from "../app.ts";
import { loadConfig } from "../config.ts";
import { createIndexes } from "../db/indexes.ts";
import { usersCollection } from "../db/users.ts";
import { createTestDb } from "../testDb.ts";

const config = loadConfig(process.env);
const db = createTestDb();
// The unique email index answers a second sign-up.
await createIndexes(db);
const app = createApp({ logger: pino({ level: "silent" }), db, devUserId: config.DEV_USER_ID });

let accounts = 0;
// A new account for each test, so they don't share one.
async function signUp() {
  accounts += 1;
  const account = { email: `cook${String(accounts)}@example.com`, password: "a long password" };
  const response = await request(app)
    .post("/api/auth/signup")
    .send({ ...account, name: "Cook" });
  return { ...account, response };
}

test("signup makes an account and answers 201 me, its email lowercase", async () => {
  const response = await request(app)
    .post("/api/auth/signup")
    .send({ email: " New@Example.com ", password: "a long password", name: "Dana" });

  expect(response.status).toBe(201);
  const { id } = MeSchema.parse(response.body);
  // The email is stored lowercase (design §8.3).
  expect(response.body).toEqual({ id, email: "new@example.com", name: "Dana" });
  expect(await usersCollection(db).countDocuments({ email: "new@example.com" })).toBe(1);
});

test("signup with an email that has an account answers 409, whatever its case", async () => {
  const { email } = await signUp();

  const response = await request(app)
    .post("/api/auth/signup")
    .send({ email: email.toUpperCase(), password: "another password", name: "Other" });
  expect(response.status).toBe(409);
  expect(response.body).toMatchObject({ error: { code: "email_taken" } });
});

test("signup with a bad email or a short password answers 400 naming them", async () => {
  const response = await request(app)
    .post("/api/auth/signup")
    .send({ email: "not an email", password: "short", name: "" });

  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({
    error: {
      fields: {
        email: "Enter a valid email.",
        password: "Use at least 8 characters.",
        name: "Enter your name.",
      },
    },
  });
});

test("the database keeps the password's argon2id hash, never the password", async () => {
  const { email, password } = await signUp();

  const user = await usersCollection(db).findOne({ email });
  expect(user?.passwordHash).toMatch(/^\$argon2id\$/);
  expect(JSON.stringify(user)).not.toContain(password);
});

test("login with the right password answers 200 me", async () => {
  const { email, password, response: signup } = await signUp();

  const response = await request(app).post("/api/auth/login").send({ email, password });
  expect(response.status).toBe(200);
  expect(response.body).toEqual(signup.body);
});

test("a wrong email and a wrong password get the same 401", async () => {
  const { email } = await signUp();

  const wrongEmail = await request(app)
    .post("/api/auth/login")
    .send({ email: "nobody@example.com", password: "a long password" });
  const wrongPassword = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "not the password" });
  expect(wrongEmail.status).toBe(401);
  expect(wrongPassword.status).toBe(401);
  expect(wrongEmail.body).toEqual(wrongPassword.body);
});

test("login with a password over 200 characters answers 400 without checking it", async () => {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email: "cook@example.com", password: "x".repeat(201) });

  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({
    error: { fields: { password: "Keep the password under 200 characters." } },
  });
});
