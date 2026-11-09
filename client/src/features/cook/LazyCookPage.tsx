import { lazy, Suspense } from "react";

// Cook mode is its own chunk, fetched when it opens: in the first load it would put a recipe's
// page over its JS budget (docs/metrics/m05.md: 1.0 kB under).
const CookPage = lazy(async () => ({
  default: (await import("./CookPage.tsx")).CookPage,
}));

export function LazyCookPage() {
  return (
    <Suspense fallback={<p className="text-text-muted">Loading the recipe…</p>}>
      <CookPage />
    </Suspense>
  );
}
