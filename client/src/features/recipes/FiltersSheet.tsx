import { Button } from "../../components/ui/Button.tsx";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "../../components/ui/Sheet.tsx";
import { TagPicker } from "./TagPicker.tsx";

type FiltersSheetProps = {
  selected: string[];
  onChange: (tags: string[]) => void;
  onClose: () => void;
  // Where focus goes when it closes: the Filters button (ListFilters). The sheet has no Trigger
  // of its own (it loads on the first press), so Radix wouldn't know where to put it back.
  focusOnClose: () => void;
};

// The Filters sheet, on a phone (design §14; FiltersPanel from 1024 px). Tags apply as they're
// ticked, so the grid behind is already filtered when it closes: Show recipes only closes it. Its
// count of matches waits for the API (M8 F1).
export function FiltersSheet({ selected, onChange, onClose, focusOnClose }: FiltersSheetProps) {
  return (
    // Open while it's on the page; closing (Show recipes, ✕, Escape) asks to be taken away.
    <Sheet
      open
      onOpenChange={(opening) => {
        if (!opening) onClose();
      }}
    >
      {/* No description: the title and the groups' legends say it all. */}
      <SheetContent
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          focusOnClose();
        }}
      >
        <SheetTitle className="px-4 pt-5 pb-2 font-sans text-lg font-semibold">Filters</SheetTitle>
        <div className="overflow-y-auto px-4 pb-4">
          <TagPicker legend="Filter by tags" selected={selected} onChange={onChange} />
        </div>
        {/* Above the phone's home bar, where it has one. */}
        <div className="flex gap-3 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
