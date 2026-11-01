import { HealthSchema } from "@pinch/shared";
import { queryOptions } from "@tanstack/react-query";

// Query key and fetch function live together (react-vite.md). The response is parsed with the
// shared schema before any component sees it.
export const healthQuery = queryOptions({
  queryKey: ["health"],
  queryFn: async () => {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error(`GET /api/health answered ${String(response.status)}`);
    return HealthSchema.parse(await response.json());
  },
});
