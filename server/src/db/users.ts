import type { Me } from "@pinch/shared";
import type { Db, ObjectId } from "mongodb";

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
