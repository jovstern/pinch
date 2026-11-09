import type { Recipe } from "@pinch/shared";
import { lazy, Suspense, useRef, useState } from "react";
import { Button } from "../../components/ui/Button.tsx";

// The dialog (Radix, ~14 kB) is its own chunk, fetched only when Delete is about to be pressed
// (pointer over it, or focus on it) or is pressed: in a recipe's first load it put the page over
// its JS budget (docs/metrics/m06.md). Not a Lazy* wrapper, as LazyRecipeForm is: the button is
// real and here at once, so it never moves; only the dialog waits. On a slow link a tap may
// wait a moment for it (no fallback: one in the button row would move the buttons), and a
// chunk that won't load is caught by Layout's ErrorBoundary, as any page's.
const loadDialog = () => import("./DeleteRecipeDialog.tsx");
const DeleteRecipeDialog = lazy(async () => ({
  default: (await loadDialog()).DeleteRecipeDialog,
}));

export function DeleteRecipeButton({ recipe }: { recipe: Recipe }) {
  // Open while it's on the page: closing takes it away, and a failed attempt with it.
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="destructive-ghost"
        aria-haspopup="dialog"
        // While its dialog is on its way (a slow link): the button says it's working. Once the
        // dialog is open it covers the button anyway.
        aria-busy={open}
        className="aria-busy:cursor-progress aria-busy:opacity-60"
        onPointerEnter={() => void loadDialog()}
        onFocus={() => void loadDialog()}
        onClick={() => {
          setOpen(true);
        }}
      >
        Delete
      </Button>
      {open && (
        <Suspense>
          <DeleteRecipeDialog
            recipe={recipe}
            onClose={() => {
              setOpen(false);
            }}
            focusOnClose={() => buttonRef.current?.focus()}
          />
        </Suspense>
      )}
    </>
  );
}
