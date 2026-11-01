import { z } from "zod";

// GET /api/health and GET /api/ready.
export const HealthSchema = z.object({ status: z.literal("ok") });

export type Health = z.infer<typeof HealthSchema>;
