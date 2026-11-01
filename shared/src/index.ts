// Zod schemas used by both the client and the server, so the API's shapes can't drift apart
// (design §8). Types come from the schemas with z.infer.
export { HealthSchema, type Health } from "./health.ts";
