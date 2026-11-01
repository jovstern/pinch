import { useQuery } from "@tanstack/react-query";
import { healthQuery } from "./healthQuery.ts";

// A small sign that the client reaches the API; it goes away once real screens exist.
export function ApiStatus() {
  const { isPending, isError } = useQuery(healthQuery);

  let label = "Connected to the API";
  if (isPending) label = "Checking the API…";
  if (isError) label = "Can't reach the API";

  return (
    <p role="status" className="text-sm text-text-muted">
      {label}
    </p>
  );
}
