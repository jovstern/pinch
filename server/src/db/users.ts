import type { Language, Me } from "@pinch/shared";
import { MongoServerError, ObjectId, type Db } from "mongodb";
import { sessionsCollection } from "./sessions.ts";

// An account (design §6, §8.3). The email is lowercase (the schema makes it so) and unique.
export type UserDocument = {
  _id: ObjectId;
  email: string;
  name: string;
  // argon2id; an account made with Google has none.
  passwordHash?: string;
  // Google's "sub", set by a Google sign-in (A4).
  googleId?: string;
  // The interface's language (§16.1, M10); an account from before M10 has none: English.
  language?: Language;
  createdAt: Date;
};

export function usersCollection(db: Db) {
  return db.collection<UserDocument>("users");
}

// What the API says about the signed-in user: never the hash.
export function toMe(user: UserDocument): Me {
  return {
    id: user._id.toHexString(),
    email: user.email,
    name: user.name,
    language: user.language ?? "en",
  };
}

// The account with this email, for the db: scripts (seed, adopt). None stops the script with a
// message that says what to do.
export async function findAccount(db: Db, email: string) {
  const user = await usersCollection(db).findOne({ email: email.trim().toLowerCase() });
  if (!user) throw new Error(`No account has the email ${email}: sign up in the app first.`);
  return user;
}

// A Google sign-in's account (design §8.3): the one with this Google id; else the one with this
// email, which Google has verified, now linked to it; else a new one, with no password. An email
// whose account is linked to another Google account can't sign in this way: "linked_elsewhere".
export async function googleAccount(
  db: Db,
  {
    googleId,
    email,
    name,
    language,
  }: { googleId: string; email: string; name: string; language: Language },
) {
  const users = usersCollection(db);
  const returning = await users.findOne({ googleId });
  if (returning) return returning;
  // Google has proved the email is theirs; the account's password proved nothing (anyone can sign
  // up with an email that isn't theirs and wait). So linking drops the password and ends every
  // session it made: whoever set it up is out.
  const linked = await users.findOneAndUpdate(
    { email, googleId: { $exists: false } },
    { $set: { googleId }, $unset: { passwordHash: "" } },
    { returnDocument: "after" },
  );
  if (linked) {
    await sessionsCollection(db).deleteMany({ userId: linked._id });
    return linked;
  }
  const user: UserDocument = {
    _id: new ObjectId(),
    email,
    name,
    googleId,
    language,
    createdAt: new Date(),
  };
  try {
    await users.insertOne(user);
    return user;
  } catch (error) {
    // 11000, a duplicate key: the email has an account linked to another Google id, or this
    // Google id's account was made a moment ago (a sign-in in a second tab).
    if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
    return (await users.findOne({ googleId })) ?? "linked_elsewhere";
  }
}
