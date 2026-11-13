import { Plus, X } from "lucide-react";
import { lazy, Suspense, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "../../components/ErrorBoundary.tsx";
import { FieldError } from "../../components/FieldError.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { tagLabel } from "./tagLabels.ts";

// The sheet is its own chunk, fetched on the first press of Add tag, as My recipes' Filters
// sheet (FiltersButton): with the editor's LeaveDialog, Radix's dialog was ~12 kB of the
// editor's first load (docs/metrics/m08.md).
const TagsSheet = lazy(async () => ({
  default: (await import("./TagsSheet.tsx")).TagsSheet,
}));

type RecipeTagsProps = {
  selected: string[];
  onChange: (tags: string[]) => void;
  errors: unknown[];
};

// A recipe's tags in the editor (design §14): the chosen ones as chips with ✕, and Add tag,
// which opens every tag by facet in a sheet (as My recipes' Filters), so the column stays short.
export function RecipeTags({ selected, onChange, errors }: RecipeTagsProps) {
  const { t } = useTranslation();
  // As in TextField: Add tag is marked invalid and points to the error (over 20 tags), so the
  // form's focus after a failed Save lands on it, just above the message. A button marked
  // invalid is unusual, but it's the one control on the page the tags are changed with.
  const errorId = useId();
  const invalid = errors.some((message) => typeof message === "string");
  // A chip's ✕ takes itself away: focus moves to Add tag, the next thing in the row.
  const addTagRef = useRef<HTMLButtonElement>(null);
  // The sheet is open while it's on the page: closing takes it away.
  const [picking, setPicking] = useState(false);

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{t("recipe.tags")}</legend>
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
              aria-label={t("editor.removeTag", { tag: tagLabel(tag) })}
              onClick={() => {
                onChange(selected.filter((other) => other !== tag));
                addTagRef.current?.focus();
              }}
              className="min-w-11 rounded-full px-0 text-muted-foreground"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </li>
        ))}
        <li>
          <Button
            ref={addTagRef}
            type="button"
            variant="outline"
            aria-haspopup="dialog"
            aria-expanded={picking}
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            className="rounded-full"
            onClick={() => {
              setPicking(true);
            }}
          >
            <Plus aria-hidden="true" className="size-4" />
            {t("editor.addTag")}
          </Button>
          {/* A sheet that won't load (offline, a new deploy) just doesn't open: caught here, not
              by the page's ErrorBoundary, which would replace the form and what's typed in it. */}
          {picking && (
            <ErrorBoundary fallback={null}>
              <Suspense>
                <TagsSheet
                  selected={selected}
                  onChange={onChange}
                  onClose={() => {
                    setPicking(false);
                  }}
                  focusOnClose={() => addTagRef.current?.focus()}
                />
              </Suspense>
            </ErrorBoundary>
          )}
        </li>
      </ul>
      <FieldError id={errorId} errors={errors} />
    </fieldset>
  );
}
