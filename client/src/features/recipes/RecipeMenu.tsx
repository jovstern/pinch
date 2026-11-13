import type { Recipe } from "@pinch/shared";
import { Ellipsis, Pencil, Share2, Trash2 } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "../../components/ui/Button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/DropdownMenu.tsx";

// The dialog (Radix, ~14 kB) is its own chunk, fetched only when Delete may be chosen soon (as
// the menu first opens, which is as it appears: LazyRecipeMenu) or is chosen: in a recipe's first
// load it put the page over its JS budget (docs/metrics/m06.md). On a slow link the choice may wait a moment for it, and a chunk that
// won't load is caught by Layout's ErrorBoundary, as any page's.
const loadDialog = () => import("./DeleteRecipeDialog.tsx");
const DeleteRecipeDialog = lazy(async () => ({
  default: (await loadDialog()).DeleteRecipeDialog,
}));

// ⋯ beside Cook (design §14): what a recipe page does less often than cooking.
export function RecipeMenu({ recipe }: { recipe: Recipe }) {
  const { t } = useTranslation();
  // Open while it's on the page: closing takes it away, and a failed attempt with it.
  const [deleting, setDeleting] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // An effect: it starts a download, outside React; once, as the menu appears open. (Not in
  // onOpenChange: a menu that starts open never calls it.)
  useEffect(() => {
    void loadDialog();
  }, []);
  return (
    <>
      {/* Not modal: a modal menu hides the rest of the page from screen readers (aria-hidden on
          the header and main), which axe counts as violations (docs/metrics/m08.md). Focus still
          stays in the menu (Tab doesn't leave it) and a press outside closes it. */}
      <DropdownMenu
        modal={false}
        // Open as it appears: it appears when ⋯ is pressed (LazyRecipeMenu).
        defaultOpen
      >
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="outline"
            aria-label={t("recipe.moreActions")}
            // While the dialog is on its way (a slow link): the button says it's working. Once
            // the dialog is open it covers the button anyway.
            aria-busy={deleting}
            className="px-3"
          >
            <Ellipsis aria-hidden="true" className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to={`/recipes/${recipe.id}/edit`}>
              <Pencil aria-hidden="true" />
              {t("recipe.edit")}
            </Link>
          </DropdownMenuItem>
          {/* A placeholder (design §1): sharing comes after auth. Unavailable, not hidden, so
              the household sees it's planned. Radix's arrow keys skip a disabled item; it's
              still in the menu, and read as unavailable. */}
          <DropdownMenuItem disabled>
            <Share2 aria-hidden="true" />
            {t("recipe.shareSoon")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              setDeleting(true);
            }}
          >
            <Trash2 aria-hidden="true" />
            {t("recipe.delete")}
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
