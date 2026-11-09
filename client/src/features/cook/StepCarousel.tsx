import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode, UIEvent } from "react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Button } from "../../components/ui/Button.tsx";
import { cn } from "../../lib/cn.ts";
import { nearestStep } from "./nearestStep.ts";

type StepCarouselProps = {
  steps: string[];
  // The card for a step (a StepCard).
  card: (step: string) => ReactNode;
  onDone: () => void;
};

// Dots up to this many steps: at 360 px, 7 still leaves each 24 px wide (WCAG 2.5.8) between ‹
// and Next; past it the counter and the bar say where you are.
const mostDots = 7;

// Cook mode's steps as a row of cards, one in view, the next peeking 24 px at the right, swiped
// sideways on a phone (design §14). Native scroll snap, not a carousel library (shadcn's is
// Embla): the browser already snaps, flings and follows the finger, so all that's left is to
// keep the step and the row together. Swiping can't be the only way (WCAG 2.5.7, a wet thumb):
// ‹ › and the dots on a phone, Back and Next from 768 px, the ← → keys and a tap on the peeking
// card move it too.
export function StepCarousel({ steps, card, onDone }: StepCarouselProps) {
  const [index, setIndex] = useState(0);
  const row = useRef<HTMLOListElement>(null);
  const settling = useRef<number | undefined>(undefined);
  // An edit elsewhere may have removed steps since: never past the last one.
  const last = steps.length - 1;
  const current = Math.min(index, last);
  const label = (step: number) => `Step ${String(step + 1)} of ${String(steps.length)}`;

  // The step changes at once, so the counter answers the press, and the row scrolls to its card:
  // smoothly unless the system asks for less motion (motion-safe:scroll-smooth below).
  function goTo(step: number) {
    setIndex(step);
    const list = row.current;
    const target = list?.querySelectorAll<HTMLElement>(":scope > li")[step];
    if (list && target) list.scrollLeft = target.offsetLeft;
  }

  // The step is set once the row has stopped for 100 ms, not on every scroll event: a press's own
  // smooth scroll would otherwise pass back through the steps it leaves. Not scrollend, which
  // Safari only has from 26.2.
  function settle(event: UIEvent<HTMLOListElement>) {
    const list = event.currentTarget;
    clearTimeout(settling.current);
    settling.current = window.setTimeout(() => {
      const cards = list.querySelectorAll<HTMLElement>(":scope > li");
      const starts = Array.from(cards, (each) => each.offsetLeft);
      setIndex(nearestStep(list.scrollLeft, starts, list.scrollWidth - list.clientWidth));
    }, 100);
  }

  // The ← → keys, wherever the focus is, except where the arrows are someone else's: a field, a
  // menu, a dialog. Not held down, nor with a modifier (Alt+← is the browser's Back).
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.repeat || event.defaultPrevented) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const theirs = "input, textarea, select, [contenteditable], [role=menu], [role=dialog]";
    if (event.target instanceof Element && event.target.closest(theirs)) return;
    if (event.key === "ArrowLeft" && current > 0) goTo(current - 1);
    else if (event.key === "ArrowRight" && current < last) goTo(current + 1);
    else return;
    // Not also the browser's own scroll of the row, when the focus is in a card.
    event.preventDefault();
  });
  useEffect(() => {
    function listener(event: KeyboardEvent) {
      onKeyDown(event);
    }
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, []);

  return (
    <section>
      {/* A status (polite, read whole), so a screen reader reads each new step and its number:
          the step's words again, as the card itself isn't announced. */}
      <p role="status" className="text-sm font-semibold text-muted-foreground">
        {label(current)}
        <span className="sr-only">: {steps[current]}</span>
      </p>
      {/* The steps done and this one, filled; the status says it in words. The unfilled part and
          the dots are input's colour (border-field), 3:1 against the page. */}
      <div aria-hidden="true" className="mt-2 flex gap-1">
        {steps.map((_, step) => (
          <span
            key={step}
            className={cn(
              "h-1 flex-1 rounded-full",
              step <= current ? "bg-foreground" : "bg-input",
            )}
          />
        ))}
      </div>

      {/* relative: the cards' offsetLeft is measured from the row. The cards out of view aren't
          inert, on purpose: tabbing into one scrolls it in, and the step follows. */}
      <ol
        ref={row}
        aria-label="Steps"
        onScroll={settle}
        className="relative mt-4 grid snap-x snap-mandatory [scrollbar-width:none] auto-cols-[calc(100%-2rem)] grid-flow-col gap-2 overflow-x-auto overscroll-x-contain motion-safe:scroll-smooth"
      >
        {steps.map((step, position) => (
          // A tap on the peeking card brings it in; a swipe isn't a click, so it doesn't.
          <li
            key={position}
            aria-label={label(position)}
            className="snap-start snap-always"
            onClick={() => {
              if (position !== current) goTo(position);
            }}
          >
            {card(step)}
          </li>
        ))}
      </ol>

      {/* Each stays the same button from step to step (aria-disabled, not disabled; Next turns
          into Done), so a keyboard's focus stays on it. Small around the dots on a phone (Next a
          fixed width, so Done doesn't move the row), big and as wide as each other from 768 px:
          easy to reach with a knuckle. */}
      <div className="mt-4 flex items-center gap-2 md:mt-6 md:gap-3">
        <Button
          type="button"
          variant="secondary"
          className="size-11 shrink-0 px-0 md:h-14 md:w-40 md:text-lg"
          aria-disabled={current === 0}
          onClick={() => {
            if (current > 0) goTo(current - 1);
          }}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
          <span className="sr-only md:not-sr-only">Back</span>
        </Button>
        {/* A dot per step that jumps to it: 44 px tall, and 44 px wide where they fit. From 768
            px, Back, Next and the keys are enough. */}
        <div className="flex min-w-0 flex-1 justify-center md:hidden">
          {steps.length <= mostDots &&
            steps.map((_, step) => (
              <button
                key={step}
                type="button"
                aria-label={`Step ${String(step + 1)}`}
                aria-current={step === current ? "step" : undefined}
                className="group flex h-11 max-w-11 min-w-0 flex-1 items-center justify-center rounded-control"
                onClick={() => {
                  goTo(step);
                }}
              >
                <span className="h-2 w-2 rounded-full bg-input group-aria-[current=step]:w-5 group-aria-[current=step]:bg-foreground" />
              </button>
            ))}
        </div>
        <Button
          type="button"
          className="w-20 shrink-0 px-0 md:h-14 md:w-40 md:text-lg"
          onClick={() => {
            if (current < last) goTo(current + 1);
            else onDone();
          }}
        >
          <span className={cn(current < last && "sr-only md:not-sr-only")}>
            {current < last ? "Next" : "Done"}
          </span>
          {current < last && <ChevronRight aria-hidden="true" className="size-5" />}
        </Button>
        <p className="hidden text-sm whitespace-nowrap text-muted-foreground md:pointer-fine:block">
          or the ← → keys
        </p>
      </div>
    </section>
  );
}
