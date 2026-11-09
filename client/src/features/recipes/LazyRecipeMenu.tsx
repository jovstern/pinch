import type { Recipe } from "@pinch/shared";
import { Ellipsis } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Button } from "../../components/ui/Button.tsx";

// The menu (Radix's, with its positioning library, ~19.6 kB) is its own chunk, fetched as the
// recipe shows: in the first load it put every page ~19 kB further over the JS budget. Deferred,
// not saved: a recipe still fetches it, after the page is up. Until it arrives, a ⋯ that looks
// and reads the same (RecipeMenu's trigger); pressed then, the menu opens as soon as it's there.
// Two costs, both small: the stand-in is swapped for the real button, so focus on it in that
// moment is lost; and a chunk that won't load (a deploy since the page was opened) fails the
// page, caught by Layout's ErrorBoundary, where before only Delete would have.
const RecipeMenu = lazy(async () => ({
  default: (await import("./RecipeMenu.tsx")).RecipeMenu,
}));

export function LazyRecipeMenu({ recipe }: { recipe: Recipe }) {
  const [openOnArrival, setOpenOnArrival] = useState(false);
  return (
    <Suspense
      fallback={
        <Button
          type="button"
          variant="outline"
          aria-label="More actions"
          aria-haspopup="menu"
          aria-busy={openOnArrival}
          className="px-3 aria-busy:cursor-progress aria-busy:opacity-60"
          onClick={() => {
            setOpenOnArrival(true);
          }}
        >
          <Ellipsis aria-hidden="true" className="size-5" />
        </Button>
      }
    >
      <RecipeMenu recipe={recipe} defaultOpen={openOnArrival} />
    </Suspense>
  );
}
