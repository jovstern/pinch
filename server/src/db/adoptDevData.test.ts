import { ObjectId } from "mongodb";
import { expect, test } from "vitest";
import { createTestDb } from "../testDb.ts";
import { createTestUser } from "../testUser.ts";
import { adoptDevData } from "./adoptDevData.ts";
import { IMPORT_LIFETIME_MS, importsCollection } from "./imports.ts";
import { recipesCollection } from "./recipes.ts";
import { seedRecipes } from "./seed.ts";
import { usageCollection } from "./usage.ts";

const db = createTestDb();
const devUserId = new ObjectId();

test("the dev user's recipes, imports and counts become the account's, once", async () => {
  const { userId } = await createTestUser(db);
  const email = `${userId.toHexString()}@example.com`;
  await seedRecipes(db, devUserId);
  const now = new Date();
  await importsCollection(db).insertOne({
    _id: new ObjectId(),
    ownerId: devUserId,
    status: "pending",
    input: { type: "text", text: "Lentil soup for two." },
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + IMPORT_LIFETIME_MS),
  });
  // Both imported on the same day: the counts add up.
  const usage = usageCollection(db);
  await usage.insertOne({ ownerId: devUserId, day: "2026-11-11", imports: 3, expiresAt: now });
  await usage.insertOne({ ownerId: userId, day: "2026-11-11", imports: 2, expiresAt: now });

  // An email typed with capitals and spaces still finds the account.
  expect(await adoptDevData(db, devUserId, ` ${email.toUpperCase()} `)).toEqual({
    recipes: 10,
    imports: 1,
  });
  expect(await adoptDevData(db, devUserId, email)).toEqual({ recipes: 0, imports: 0 });

  expect(await recipesCollection(db).countDocuments({ ownerId: userId })).toBe(10);
  expect(await importsCollection(db).countDocuments({ ownerId: userId })).toBe(1);
  expect(
    await usage.find({}, { projection: { _id: 0, ownerId: 1, imports: 1 } }).toArray(),
  ).toEqual([{ ownerId: userId, imports: 5 }]);
});

test("adopting into an email with no account fails and moves nothing", async () => {
  const owner = new ObjectId();
  await recipesCollection(db).insertOne({
    _id: new ObjectId(),
    ownerId: owner,
    title: "Toast",
    ingredients: [{ name: "bread" }],
    steps: ["Toast it."],
    tags: [],
    source: { type: "manual" },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await expect(adoptDevData(db, owner, "nobody@example.com")).rejects.toThrow(
    "No account has the email nobody@example.com",
  );
  expect(await recipesCollection(db).countDocuments({ ownerId: owner })).toBe(1);
});

test("adopting into the dev user itself fails", async () => {
  const { userId } = await createTestUser(db);

  await expect(adoptDevData(db, userId, `${userId.toHexString()}@example.com`)).rejects.toThrow(
    "is the dev user",
  );
});
