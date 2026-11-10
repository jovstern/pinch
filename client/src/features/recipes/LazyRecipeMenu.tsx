import type { Recipe } from "@pinch/shared";
import { Ellipsis } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Button } from "../../components/ui/Button.tsx";

// The menu (Radix's, with its positioning library, ~19.6 kB) is its own chunk, fetched when ⋯ is
// about to be pressed (a pointer over it, a finger on it, focus) or is pressed: in the first load
// it put every page ~19 kB further over the JS budget, and fetched as the recipe showed (or at
// idle) it was still on the page's path to its first paint, its LCP (docs/metrics/m08.md). Until
// ⋯ is pressed, a ⋯ that looks and reads the same (RecipeMenu's trigger) stands in; pressed, the
// menu takes its place, open, as soon as it's there. Three costs, all small: a press on a slow
// link waits for the chunk; the first open by keyboard focuses the menu, not its first item (the
// menu wasn't there to see the key), so ↓ takes one press more; and a chunk that won't load (a
// deploy since the page was opened) fails the page, caught by Layout's ErrorBoundary, where
// before only Delete would have.
const loadMenu = () => import("./RecipeMenu.tsx");
const RecipeMenu = lazy(async () => ({
  default: (await loadMenu()).RecipeMenu,
}));

export function LazyRecipeMenu({ recipe }: { recipe: Recipe }) {
  const [pressed, setPressed] = useState(false);
  const standIn = (
    <Button
      type="button"
      variant="outline"
      aria-label="More actions"
      aria-haspopup="menu"
      aria-busy={pressed}
      className="px-3 aria-busy:cursor-progress aria-busy:opacity-60"
      onPointerEnter={() => void loadMenu()}
      onFocus={() => void loadMenu()}
      onClick={() => {
        setPressed(true);
      }}
    >
      <Ellipsis aria-hidden="true" className="size-5" />
    </Button>
  );
  if (!pressed) return standIn;
  return (
    <Suspense fallback={standIn}>
      <RecipeMenu recipe={recipe} />
    </Suspense>
  );
}
