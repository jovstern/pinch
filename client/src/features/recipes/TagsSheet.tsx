import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button.tsx";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "../../components/ui/Sheet.tsx";
import { TagPicker } from "./TagPicker.tsx";

type TagsSheetProps = {
  selected: string[];
  onChange: (tags: string[]) => void;
  onClose: () => void;
  // Where focus goes when it closes: Add tag (RecipeTags), as for FiltersSheet.
  focusOnClose: () => void;
};

// Every tag by facet, for a recipe in the editor (design §14), as My recipes' Filters.
export function TagsSheet({ selected, onChange, onClose, focusOnClose }: TagsSheetProps) {
  const { t } = useTranslation();
  return (
    // Open while it's on the page; closing (Done, ✕, Escape) asks to be taken away.
    <Sheet
      open
      onOpenChange={(opening) => {
        if (!opening) onClose();
      }}
    >
      <SheetContent
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          focusOnClose();
        }}
      >
        <SheetTitle className="px-4 pt-5 pb-2 font-sans text-lg font-semibold">
          {t("recipe.tags")}
        </SheetTitle>
        <div className="overflow-y-auto px-4 pt-4 pb-4">
          <TagPicker legend={t("recipe.tags")} selected={selected} onChange={onChange} />
        </div>
        {/* Tags apply as they're ticked: Done only closes it. Above the home bar. */}
        <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetClose asChild>
            <Button className="w-full">{t("editor.done")}</Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
