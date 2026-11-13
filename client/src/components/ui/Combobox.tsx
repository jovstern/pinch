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
// autocomplete". The list shows the options that start with what's typed, ignoring case; ↑ ↓ move
// through it (aria-activedescendant: focus stays in the box), Enter or a tap picks, Escape and
// leaving the box close it, and what's typed stays. Written here, as Radix has no combobox and its
// Popover would cost the editor's tight budget its positioning code (§16.10): the list is just
// placed under the box, above the Save bar.
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
  // The option ↑ ↓ are on, in the filtered list; -1 for none, so Enter still sends the form.
  const [active, setActive] = useState(-1);
  const typed = value.trim().toLocaleLowerCase();
  const shown = options.filter((option) => option.toLocaleLowerCase().startsWith(typed));
  const expanded = open && shown.length > 0;
  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-option-${String(index)}`;
  const listRef = useRef<HTMLUListElement>(null);

  // An effect: the list's scroll is the browser's. It keeps the option ↑ ↓ are on in sight, once
  // the list is drawn (open, its options filtered).
  useEffect(() => {
    const list = listRef.current;
    const option = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !option) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    const bottom = option.offsetTop + option.offsetHeight;
    if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [active, expanded]);

  function pick(option: string) {
    onValueChange(option);
    setOpen(false);
    setActive(-1);
  }

  // ↓ opens the list on its first option, ↑ on its last; then each wraps around the ends.
  function move(step: 1 | -1) {
    if (shown.length === 0) return;
    const first = step === 1 ? 0 : shown.length - 1;
    setOpen(true);
    setActive(expanded && active !== -1 ? (active + step + shown.length) % shown.length : first);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" && expanded && active !== -1) {
      // Picks the option, rather than send the form.
      event.preventDefault();
      pick(shown[active] ?? value);
    } else if (event.key === "Escape" && expanded) {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div className="relative">
      <Input
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
          setActive(-1);
        }}
        // A tap or a click shows the whole list, as a phone has no ↓.
        onClick={() => {
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onBlur={(event) => {
          setOpen(false);
          setActive(-1);
          onBlur?.(event);
        }}
        {...props}
      />
      {/* Always there, hidden when closed, so aria-controls names an element. Over the rows under
          it and the Save bar (z-10); wider than a phone's narrow box, from its start edge. */}
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
        className="absolute start-0 top-full z-20 mt-1 max-h-60 w-max min-w-full overflow-y-auto rounded-control border border-border bg-popover p-1 text-popover-foreground shadow-sheet"
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
