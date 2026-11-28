import { customTag, customTagWords, MAX_CUSTOM_TAG, tagFacets } from "@pinch/shared";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button.tsx";
import { Input } from "../../components/ui/Input.tsx";
import { ChoiceGroup } from "./ChoiceGroup.tsx";
import { facets, tagLabel } from "./tagLabels.ts";

type CustomTagFieldProps = {
  selected: string[];
  onChange: (tags: string[]) => void;
};

// A tag of the user's own, in the editor's Tags sheet (design D53): a field and Add, then the
// recipe's own tags as chips to untick, as the lists' are. Upper and lower case are one tag, and
// a tag that is already there isn't made twice: one of the lists' is ticked instead, and the
// line under the field says which.
export function CustomTagField({ selected, onChange }: CustomTagFieldProps) {
  const { t } = useTranslation();
  const id = useId();
  const noteId = useId();
  const [words, setWords] = useState("");
  const [note, setNote] = useState("");
  // The recipe's own tags, and the ones added while the sheet is open: unticked, a chip stays,
  // so it can be ticked again.
  const [own, setOwn] = useState(() => selected.filter((tag) => customTagWords(tag)));

  function add() {
    const tag = customTag(words);
    const typed = customTagWords(tag);
    if (!typed) return;
    // One of the lists' tags by its name on screen: that one, not a second tag that reads the
    // same.
    const known = listTags().find((other) => tagLabel(other).toLowerCase() === typed) ?? tag;
    if (selected.includes(known)) {
      setNote(t("editor.tagAlreadyAdded", { tag: tagLabel(known) }));
    } else {
      onChange([...selected, known]);
      setNote(known === tag ? "" : t("editor.tagInList", { tag: tagLabel(known) }));
    }
    if (known === tag && !own.includes(tag)) setOwn([...own, tag]);
    setWords("");
  }

  return (
    <div className="grid gap-4">
      <div>
        <label htmlFor={id} className="mb-2 block text-sm font-semibold">
          {t("editor.ownTag")}
        </label>
        <div className="flex gap-2">
          <Input
            id={id}
            value={words}
            maxLength={MAX_CUSTOM_TAG}
            aria-describedby={noteId}
            enterKeyHint="done"
            onChange={(event) => {
              setWords(event.target.value);
            }}
            onKeyDown={(event) => {
              // Enter adds the tag (not while an input method is composing a word: that Enter
              // picks the word), and never reaches the recipe's form, which it would save.
              if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
              event.preventDefault();
              add();
            }}
          />
          <Button type="button" variant="secondary" onClick={add}>
            {t("editor.add")}
          </Button>
        </div>
        {/* Always on the page, empty until there's something to say, so screen readers hear
            it (as the paste box's notes). */}
        <p id={noteId} role="status" className="text-sm text-muted-foreground not-empty:mt-1">
          {note}
        </p>
      </div>
      {own.length > 0 && (
        <ChoiceGroup
          legend={t("editor.ownTags")}
          type="checkbox"
          choices={own.map((tag) => ({ value: tag, label: tagLabel(tag) }))}
          selected={selected}
          onChange={(tag, on) => {
            onChange(on ? [...selected, tag] : selected.filter((other) => other !== tag));
          }}
        />
      )}
    </div>
  );
}

// Every tag of the lists.
function listTags() {
  return facets.flatMap((facet) => tagFacets[facet].map((value) => `${facet}:${value}`));
}
