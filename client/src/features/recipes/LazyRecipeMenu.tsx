import type { Recipe } from "@pinch/shared";
import { Ellipsis } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Button } from "../../components/ui/Button.tsx";

// The menu (Radix's, with its positioning library, ~19 kB) is its own chunk, fetched as the
// recipe shows: in the first load it put every page ~19 kB further over the JS budget. Until it
// arrives, a ⋯ that looks the same; pressed then, the menu opens as soon as it's there.
const RecipeMenu = lazy(async () => ({
  default: (await import("./RecipeMenu.tsx")).RecipeMenu,
}));

export function LazyRecipeMenu({ recipe }: { recipe: Recipe }) {
  const [openOnArrival, setOpenOnArrival] = useState(false);
  return (
    <Suspense
      fallback={
        <Button
          variant="outline"
          aria-label="More actions"
          aria-busy={openOnArrival}
          className="px-3 aria-busy:cursor-progress"
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
