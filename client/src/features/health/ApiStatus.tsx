import { useQuery } from "@tanstack/react-query";
import { healthQuery } from "./healthQuery.ts";

// A small sign that the client reaches the API; it goes away once real screens exist.
export function ApiStatus() {
  const { status } = useQuery(healthQuery);
  const labels = {
    pending: "Checking the API…",
    error: "Can't reach the API",
    success: "Connected to the API",
  };

  return (
    <p role="status" className="text-sm text-text-muted">
      {labels[status]}
    </p>
  );
}
