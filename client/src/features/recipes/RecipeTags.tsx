import { Plus, X } from "lucide-react";
import { useId } from "react";
import { FieldError } from "../../components/FieldError.tsx";
import { Button } from "../../components/ui/Button.tsx";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/Sheet.tsx";
import { tagLabel } from "./tagLabels.ts";
import { TagPicker } from "./TagPicker.tsx";

type RecipeTagsProps = {
  selected: string[];
  onChange: (tags: string[]) => void;
  errors: unknown[];
};

// A recipe's tags in the editor (design §14): the chosen ones as chips with ✕, and Add tag, which
// opens every tag by facet in a sheet (as My recipes' Filters), so the column stays short.
export function RecipeTags({ selected, onChange, errors }: RecipeTagsProps) {
  // As in TextField: Add tag is marked invalid and points to the error (over 20 tags), so the
  // form's focus after a failed Save lands on it, just under the message.
  const errorId = useId();
  const invalid = errors.some((message) => typeof message === "string");

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">Tags</legend>
      <ul className="flex flex-wrap gap-2">
        {selected.map((tag) => (
          <li
            key={tag}
            className="inline-flex h-11 items-center rounded-full bg-secondary ps-4 text-sm"
          >
            {tagLabel(tag)}
            <Button
              type="button"
              variant="ghost"
              aria-label={`Remove ${tagLabel(tag)}`}
              onClick={() => {
                onChange(selected.filter((other) => other !== tag));
              }}
              className="min-w-11 rounded-full px-0 text-muted-foreground"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </li>
        ))}
        <li>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                aria-invalid={invalid}
                aria-describedby={invalid ? errorId : undefined}
                className="rounded-full"
              >
                <Plus aria-hidden="true" className="size-4" />
                Add tag
              </Button>
            </SheetTrigger>
            {/* Centred and narrower from 640 px, where the full width would be a long row. */}
            <SheetContent aria-describedby={undefined} className="sm:mx-auto sm:max-w-xl">
              <SheetTitle className="px-4 pt-5 pb-2 font-sans text-lg font-semibold">
                Tags
              </SheetTitle>
              <div className="overflow-y-auto px-4 pb-4">
                <TagPicker legend="Tags" selected={selected} onChange={onChange} />
              </div>
              {/* Tags apply as they're ticked: Done only closes it. Above the home bar. */}
              <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <SheetClose asChild>
                  <Button className="w-full">Done</Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
      <FieldError id={errorId} errors={errors} />
    </fieldset>
  );
}
