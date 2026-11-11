import type { Db, ObjectId } from "mongodb";
import { importsCollection } from "./imports.ts";
import { recipesCollection } from "./recipes.ts";
import { usageCollection } from "./usage.ts";
import { findAccount } from "./users.ts";

// Gives the dev user's recipes, imports and import counts to the account with this email: the
// data made before accounts (design §8.3). Safe to run again: the second run finds nothing left.
export async function adoptDevData(db: Db, devUserId: ObjectId, email: string) {
  const user = await findAccount(db, email);
  if (user._id.equals(devUserId)) throw new Error(`${email} is the dev user: nothing to move.`);
  const toUser = { $set: { ownerId: user._id } };
  const recipes = await recipesCollection(db).updateMany({ ownerId: devUserId }, toUser);
  const imports = await importsCollection(db).updateMany({ ownerId: devUserId }, toUser);
  // A day's count is unique per user, and the account may have one for the same day: each of the
  // dev user's is added to the account's, then deleted. Two writes, not atomic: a crash between
  // them makes a rerun add that day twice. Fine for a one-off script, without transactions (D9).
  const usage = usageCollection(db);
  for (const count of await usage.find({ ownerId: devUserId }).toArray()) {
    await usage.updateOne(
      { ownerId: user._id, day: count.day },
      { $inc: { imports: count.imports }, $setOnInsert: { expiresAt: count.expiresAt } },
      { upsert: true },
    );
    await usage.deleteOne({ _id: count._id });
  }
  return { recipes: recipes.modifiedCount, imports: imports.modifiedCount };
}
