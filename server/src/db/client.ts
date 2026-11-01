import { MongoClient } from "mongodb";

export const mongoOptions = {
  // Fail in 5 s rather than the driver's default 30 s when Mongo isn't running; at startup
  // that stops the API with the driver's error.
  serverSelectionTimeoutMS: 5000,
  // A field Zod set to undefined (an empty optional) is left out, not stored as null.
  ignoreUndefined: true,
};

// One client per process, created at startup and reused by every request (mongodb.md).
export async function connectToMongo(uri: string) {
  const client = new MongoClient(uri, mongoOptions);
  await client.connect();
  return client;
}
