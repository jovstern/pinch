import { MongoClient } from "mongodb";

// One client per process, created at startup and reused by every request (mongodb.md).
export async function connectToMongo(uri: string) {
  // Fail in 5 s rather than the driver's default 30 s when Mongo isn't running.
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  return client;
}
