import type { Recipe } from "@pinch/shared";
import { Ellipsis, Pencil, Share2, Trash2 } from "lucide-react";
import { lazy, Suspense, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "../../components/ui/Button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/DropdownMenu.tsx";

// The dialog (Radix, ~14 kB) is its own chunk, fetched only when Delete is about to be chosen
// (as the menu opens) or is chosen: in a recipe's first load it put the page over its JS budget
// (docs/metrics/m06.md). On a slow link the choice may wait a moment for it, and a chunk that
// won't load is caught by Layout's ErrorBoundary, as any page's.
const loadDialog = () => import("./DeleteRecipeDialog.tsx");
const DeleteRecipeDialog = lazy(async () => ({
  default: (await loadDialog()).DeleteRecipeDialog,
}));

type RecipeMenuProps = {
  recipe: Recipe;
  // Open as it appears: ⋯ was pressed while this chunk was on its way (LazyRecipeMenu).
  defaultOpen: boolean;
};

// ⋯ beside Cook (design §14): what a recipe page does less often than cooking.
export function RecipeMenu({ recipe, defaultOpen }: RecipeMenuProps) {
  // Open while it's on the page: closing takes it away, and a failed attempt with it.
  const [deleting, setDeleting] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <DropdownMenu
        defaultOpen={defaultOpen}
        onOpenChange={(open) => {
          if (open) void loadDialog();
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            aria-label="More actions"
            // While the dialog is on its way (a slow link): the button says it's working. Once
            // the dialog is open it covers the button anyway.
            aria-busy={deleting}
            className="px-3 aria-busy:cursor-progress aria-busy:opacity-60"
          >
            <Ellipsis aria-hidden="true" className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to={`/recipes/${recipe.id}/edit`}>
              <Pencil aria-hidden="true" />
              Edit
            </Link>
          </DropdownMenuItem>
          {/* A placeholder (design §1): sharing comes after auth. Unavailable, not hidden, so
              the household sees it's planned. */}
          <DropdownMenuItem disabled>
            <Share2 aria-hidden="true" />
            Share · coming soon
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              setDeleting(true);
            }}
          >
            <Trash2 aria-hidden="true" />
            Delete…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {deleting && (
        <Suspense>
          <DeleteRecipeDialog
            recipe={recipe}
            onClose={() => {
              setDeleting(false);
            }}
            focusOnClose={() => triggerRef.current?.focus()}
          />
        </Suspense>
      )}
    </>
  );
}
