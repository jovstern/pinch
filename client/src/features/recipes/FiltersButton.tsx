import { SlidersHorizontal } from "lucide-react";
import { lazy, Suspense, useRef, useState } from "react";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button } from "../../components/ui/Button.tsx";

// The sheet (Radix's Dialog: its focus trap, scroll lock and the rest, ~12 kB) is its own chunk,
// fetched on the first press, as DeleteRecipeDialog is: in My recipes' first load it put every
// page over its JS budget, for a button only a phone shows (docs/metrics/m08.md). On a slow link
// the first press waits a moment for it, as Add tag's and the editor's questions do.
const FiltersSheet = lazy(async () => ({
  default: (await import("./FiltersSheet.tsx")).FiltersSheet,
}));

type FiltersButtonProps = {
  selected: string[];
  onChange: (tags: string[]) => void;
};

// The Filters button, on a phone (design §14), and the sheet it opens.
export function FiltersButton({ selected, onChange }: FiltersButtonProps) {
  // Open while it's on the page: closing takes it away.
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const count = selected.length;
  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="shrink-0 px-3"
        onClick={() => {
          setOpen(true);
        }}
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Filters
        {/* "Filters 2 applied" to a screen reader (as the New recipe tab's count). */}
        {count > 0 && (
          <>
            {" "}
            <Badge className="min-w-6 px-1.5 py-0 text-xs font-semibold">{count}</Badge>{" "}
            <span className="sr-only">applied</span>
          </>
        )}
      </Button>
      {open && (
        <Suspense>
          <FiltersSheet
            selected={selected}
            onChange={onChange}
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
