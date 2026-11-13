import { useEffect, useRef, useState, type ComponentProps, type KeyboardEvent } from "react";
import { Input } from "./Input.tsx";

type ComboboxProps = Omit<ComponentProps<"input">, "value" | "onChange"> & {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  // What the list offers; anything else typed is kept as it is.
  options: readonly string[];
  // The list's name for a screen reader.
  listLabel: string;
};

// A text field that suggests (design §16.12, D47): the APG's "editable combobox with list
// autocomplete". Typing shows the options that start with what's typed, ignoring case; a tap, a
// click or ↓ ↑ show them all, on the one the box holds. ↑ ↓ move through the list
// (aria-activedescendant: focus stays in the box), Enter or a tap picks, Escape and leaving the box
// close it, and what's typed stays. Written here, as Radix has no combobox and its Popover would
// cost the editor's tight budget its positioning code (§16.10): the list is just placed under the
// box, above the Save bar.
export function Combobox({
  id,
  value,
  onValueChange,
  options,
  listLabel,
  className,
  onBlur,
  ...props
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  // Typed since the list opened: the list is what starts with it. Opened by a tap or an arrow, the
  // whole list, so a filled box (a recipe being edited) still offers the others.
  const [filtering, setFiltering] = useState(false);
  // The option ↑ ↓ are on, in the list shown; -1 for none, so Enter still sends the form.
  const [active, setActive] = useState(-1);
  const typed = value.trim().toLocaleLowerCase();
  const shown = filtering
    ? options.filter((option) => option.toLocaleLowerCase().startsWith(typed))
    : options;
  const expanded = open && shown.length > 0;
  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-option-${String(index)}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Effects: the page's scroll is the browser's. As the list opens, a box in the screen's lower
  // half moves to its middle, so the list under it isn't cut by the screen's edge or the phone's
  // Save bar (the form has room below its last field for this).
  useEffect(() => {
    const input = inputRef.current;
    if (!expanded || !input) return;
    if (input.getBoundingClientRect().top > window.innerHeight / 2) {
      input.scrollIntoView({ block: "center" });
    }
  }, [expanded]);

  // The option ↑ ↓ are on stays in sight, in a long list.
  useEffect(() => {
    if (!expanded || active === -1) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [expanded, active]);

  // The whole list, on the option the box holds, if it holds one.
  function openAll(otherwise: number) {
    const current = options.findIndex((option) => option.toLocaleLowerCase() === typed);
    setOpen(true);
    setFiltering(false);
    setActive(current === -1 ? otherwise : current);
  }

  function close() {
    setOpen(false);
    setActive(-1);
  }

  function pick(option: string) {
    onValueChange(option);
    close();
  }

  // Closed, ↓ opens the list on its first option, ↑ on its last (or each on the box's own); open,
  // each moves one and wraps around the ends.
  function move(step: 1 | -1) {
    if (!expanded) {
      openAll(step === 1 ? 0 : options.length - 1);
    } else {
      const first = step === 1 ? 0 : shown.length - 1;
      setActive(active === -1 ? first : (active + step + shown.length) % shown.length);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // A word still being composed (an IME): its keys are the IME's.
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" && expanded && active !== -1) {
      // Picks the option, rather than send the form.
      event.preventDefault();
      pick(shown[active] ?? value);
    } else if (event.key === "Escape" && expanded) {
      close();
    }
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active !== -1 ? optionId(active) : undefined}
        autoComplete="off"
        value={value}
        className={className}
        onChange={(event) => {
          onValueChange(event.target.value);
          setOpen(true);
          setFiltering(true);
          setActive(-1);
        }}
        // A tap or a click shows the whole list, as a phone has no ↓.
        onClick={() => {
          openAll(-1);
        }}
        onKeyDown={onKeyDown}
        onBlur={(event) => {
          close();
          onBlur?.(event);
        }}
        {...props}
      />
      {/* Always there, hidden when closed, so aria-controls names an element. Over the rows under
          it and the Save bar (z-10); wider than a phone's narrow box, from its start edge. Its own
          scroll doesn't pass on to the page's at its ends. */}
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={listLabel}
        hidden={!expanded}
        // Keeps focus in the box on a press, so the box's blur doesn't close the list before the
        // option's click picks it (a tap too: the browser sends the mouse's events after it).
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        className="absolute start-0 top-full z-20 mt-1 max-h-60 w-max min-w-full overflow-y-auto overscroll-contain rounded-control border border-border bg-popover p-1 text-popover-foreground shadow-sheet"
      >
        {shown.map((option, index) => (
          <li
            key={option}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            onClick={() => {
              pick(option);
            }}
            className="flex min-h-11 min-w-28 cursor-default items-center rounded-control px-3 select-none hover:bg-secondary aria-selected:bg-secondary"
          >
            {option}
          </li>
        ))}
      </ul>
    </div>
  );
}
