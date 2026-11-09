import type { Recipe } from "@pinch/shared";
import { lazy, Suspense, useRef, useState } from "react";
import { Button } from "../../components/Button.tsx";

// The dialog (Radix, ~14 kB) is its own chunk, fetched only when Delete is about to be pressed
// (pointer over it, or focus on it) or is pressed: in a recipe's first load it put the page over
// its JS budget (docs/metrics/m06.md). The button itself is here at once, so it never moves.
const loadDialog = () => import("./DeleteRecipeDialog.tsx");
const DeleteRecipeDialog = lazy(async () => ({ default: (await loadDialog()).DeleteRecipeDialog }));

export function DeleteRecipeButton({ recipe }: { recipe: Recipe }) {
  const [open, setOpen] = useState(false);
  // Once asked for, the dialog stays on the page, closed or open, so it can close as a dialog
  // does (giving focus back) rather than vanish.
  const [asked, setAsked] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="danger-quiet"
        onPointerEnter={() => void loadDialog()}
        onFocus={() => void loadDialog()}
        onClick={() => {
          setAsked(true);
          setOpen(true);
        }}
      >
        Delete
      </Button>
      {asked && (
        <Suspense>
          <DeleteRecipeDialog
            recipe={recipe}
            open={open}
            onOpenChange={setOpen}
            focusOnClose={() => buttonRef.current?.focus()}
          />
        </Suspense>
      )}
    </>
  );
}
