import type { Me } from "@pinch/shared";
import { ObjectId, type Db } from "mongodb";

// An account (design §6, §8.3). The email is lowercase (the schema makes it so) and unique.
export type UserDocument = {
  _id: ObjectId;
  email: string;
  name: string;
  // argon2id; an account made with Google has none.
  passwordHash?: string;
  // Google's "sub", set by a Google sign-in (A4).
  googleId?: string;
  createdAt: Date;
};

export function usersCollection(db: Db) {
  return db.collection<UserDocument>("users");
}

// What the API says about the signed-in user: never the hash.
export function toMe(user: UserDocument): Me {
  return { id: user._id.toHexString(), email: user.email, name: user.name };
}

// The account with this email, for the db: scripts (seed, adopt). None stops the script with a
// message that says what to do.
export async function findAccount(db: Db, email: string) {
  const user = await usersCollection(db).findOne({ email: email.trim().toLowerCase() });
  if (!user) throw new Error(`No account has the email ${email}: sign up in the app first.`);
  return user;
}

// A Google sign-in's account (design §8.3): the one with this Google id; else the one with this
// email, which Google has verified, now linked to it; else a new one, with no password.
export async function googleAccount(
  db: Db,
  { googleId, email, name }: { googleId: string; email: string; name: string },
) {
  const users = usersCollection(db);
  const found =
    (await users.findOne({ googleId })) ??
    (await users.findOneAndUpdate({ email }, { $set: { googleId } }, { returnDocument: "after" }));
  if (found) return found;
  const user: UserDocument = { _id: new ObjectId(), email, name, googleId, createdAt: new Date() };
  await users.insertOne(user);
  return user;
}
