import { SlidersHorizontal } from "lucide-react";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button } from "../../components/ui/Button.tsx";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/Sheet.tsx";
import { TagPicker } from "./TagPicker.tsx";

type FiltersSheetProps = {
  selected: string[];
  onChange: (tags: string[]) => void;
};

// The Filters button and its sheet, on a phone (design §14; FiltersPanel from 1024 px). Tags apply
// as they're ticked, so the grid behind is already filtered when it closes: Show recipes only
// closes it. Its count of matches waits for the API (M8 F1).
export function FiltersSheet({ selected, onChange }: FiltersSheetProps) {
  const count = selected.length;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="shrink-0 px-3">
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
      </SheetTrigger>
      {/* No description: the title and the groups' legends say it all. */}
      <SheetContent aria-describedby={undefined}>
        <SheetTitle className="px-4 pt-5 pb-2 font-sans text-lg font-semibold">Filters</SheetTitle>
        <div className="overflow-y-auto px-4 pb-4">
          <TagPicker
            legend="Filter by tags"
            legendClassName="sr-only"
            selected={selected}
            onChange={onChange}
          />
        </div>
        <div className="flex gap-3 border-t border-border p-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => {
              onChange([]);
            }}
          >
            Clear
          </Button>
          <SheetClose asChild>
            <Button className="flex-2">Show recipes</Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
