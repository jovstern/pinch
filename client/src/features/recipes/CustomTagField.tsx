import { customTag, customTagWords, MAX_CUSTOM_TAG, tagFacets } from "@pinch/shared";
import { Plus } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button.tsx";
import { Input } from "../../components/ui/Input.tsx";
import { cn } from "../../lib/cn.ts";
import { ChoiceGroup } from "./ChoiceGroup.tsx";
import { facets, tagLabel } from "./tagLabels.ts";

type CustomTagFieldProps = {
  selected: string[];
  onChange: (tags: string[]) => void;
};

// The user's own tags, in the editor's Tags sheet (design D53): "Your tags", the recipe's own as
// chips to untick, as the lists' are, then a button that adds one: "Add +" while there are
// none, a bare + after them. Pressed, a chip-sized field takes the words; Enter, or leaving it,
// adds them. No field shown until then: a field at the sheet's top read as a search of the tags
// (the user, 2026-11-28). Upper and lower case are one tag, and a tag that is already there
// isn't made twice: one of the lists' is ticked instead, and the line under the tags says which.
export function CustomTagField({ selected, onChange }: CustomTagFieldProps) {
  const { t } = useTranslation();
  const noteId = useId();
  const addRef = useRef<HTMLButtonElement>(null);
  // The field is on the page only while a tag is being written.
  const [writing, setWriting] = useState(false);
  const [words, setWords] = useState("");
  const [note, setNote] = useState("");
  // The recipe's own tags, and the ones added while the sheet is open: unticked, a chip stays,
  // so it can be ticked again.
  const [own, setOwn] = useState(() => selected.filter((tag) => customTagWords(tag) !== undefined));

  function add() {
    // The field goes whatever comes of it; the line under the tags says what did.
    setWriting(false);
    setWords("");
    const tag = customTag(words);
    const typed = customTagWords(tag);
    if (!typed) return;
    // Lower case can be longer than what was typed (Turkish "İ"), past what the field allows.
    if (typed.length > MAX_CUSTOM_TAG) {
      setNote(t("editor.tagTooLong", { max: MAX_CUSTOM_TAG }));
      return;
    }
    // One of the lists' tags, by its name on screen or its own word ("middle-eastern", or
    // "italian" on a Hebrew page): that one, not a second tag that reads the same.
    const known = listTags().find((other) => namesOf(other).includes(typed)) ?? tag;
    if (selected.includes(known)) {
      setNote(t("editor.tagAlreadyAdded", { tag: tagLabel(known) }));
    } else {
      onChange([...selected, known]);
      setNote(known === tag ? "" : t("editor.tagInList", { tag: tagLabel(known) }));
    }
    if (known === tag && !own.includes(tag)) setOwn([...own, tag]);
  }

  return (
    <div>
      <ChoiceGroup
        legend={t("editor.ownTags")}
        type="checkbox"
        choices={own.map((tag) => ({ value: tag, label: tagLabel(tag) }))}
        selected={selected}
        onChange={(tag, on) => {
          onChange(on ? [...selected, tag] : selected.filter((other) => other !== tag));
        }}
      >
        {writing && (
          <Input
            // The button was just pressed for it, so it takes focus (and a phone's keyboard).
            autoFocus
            aria-label={t("editor.ownTag")}
            aria-describedby={noteId}
            value={words}
            maxLength={MAX_CUSTOM_TAG}
            enterKeyHint="done"
            className="w-40 rounded-full px-4 text-sm"
            onChange={(event) => {
              setWords(event.target.value);
            }}
            // Leaving it adds what's written, as Enter does: on a phone there may be no Enter.
            onBlur={add}
            onKeyDown={(event) => {
              // Enter adds the tag (not while an input method is composing a word: that Enter
              // picks the word), and never reaches the recipe's form, which it would save.
              // Focus goes back to the button, for the next one.
              if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
              event.preventDefault();
              addRef.current?.focus();
            }}
          />
        )}
        <Button
          ref={addRef}
          type="button"
          variant="outline"
          // With tags before it, the + alone says it; its name is always whole.
          aria-label={t("editor.ownTag")}
          aria-describedby={noteId}
          className={cn("rounded-full", own.length > 0 && "min-w-11 px-0")}
          onClick={() => {
            setNote("");
            setWriting(true);
          }}
        >
          {own.length === 0 && t("editor.add")}
          <Plus aria-hidden="true" className="size-4" />
        </Button>
      </ChoiceGroup>
      {/* Always on the page, empty until there's something to say, so screen readers hear it
          (as the paste box's notes). */}
      <p id={noteId} role="status" className="text-sm text-muted-foreground not-empty:mt-2">
        {note}
      </p>
    </div>
  );
}

// Every tag of the lists.
function listTags() {
  return facets.flatMap((facet) => tagFacets[facet].map((value) => `${facet}:${value}`));
}

// What a list's tag can be typed as: its label in the page's language, and its own word, with
// its hyphen or with a space. Not its label in the other language: a page loads only its own
// (D39).
function namesOf(tag: string) {
  const value = tag.slice(tag.indexOf(":") + 1);
  return [tagLabel(tag).toLowerCase(), value, value.replaceAll("-", " ")];
}
