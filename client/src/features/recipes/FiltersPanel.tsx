import { useId } from "react";
import { Button } from "../../components/ui/Button.tsx";
import { TagPicker } from "./TagPicker.tsx";

type FiltersPanelProps = {
  selected: string[];
  onChange: (tags: string[]) => void;
};

// The Filters from 1024 px: always open on the left, the same groups as the phone's sheet, as
// checkboxes (design §14). The grid updates as they're ticked.
export function FiltersPanel({ selected, onChange }: FiltersPanelProps) {
  const headingId = useId();
  return (
    <aside aria-labelledby={headingId} className="hidden w-60 shrink-0 lg:block">
      <div className="flex min-h-11 items-center justify-between">
        <h2 id={headingId} className="font-sans text-lg font-semibold">
          Filters
        </h2>
        {selected.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            className="px-2 text-sm underline underline-offset-4"
            onClick={() => {
              onChange([]);
            }}
          >
            Clear
          </Button>
        )}
      </div>
      <TagPicker
        legend="Filter by tags"
        legendClassName="sr-only"
        selected={selected}
        onChange={onChange}
        look="list"
      />
    </aside>
  );
}
