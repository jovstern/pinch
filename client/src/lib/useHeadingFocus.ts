import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

// After Save, Save changes, Delete or Discard, the page that opens takes the focus on its h1
// (tabIndex -1), so the keyboard and a screen reader carry on from the top of the new page rather
// than from the body (ui-craft: focus is never lost). The navigation asks for it in its state.
export const focusHeading = { focusHeading: true };

// The page's h1 takes the returned ref. An effect: focus is the browser's, outside React. It runs
// on arriving at that history entry (its key), not on every render, so it never pulls the focus
// back; and the state stays with the entry, so Back, Forward or a reload onto it focus the heading
// again, without scrolling (the browser keeps its own scroll there). The page must already have
// its data when it arrives (the save puts it in the cache; My recipes' heading is always there):
// a heading drawn later isn't focused.
export function useHeadingFocus() {
  const heading = useRef<HTMLHeadingElement>(null);
  const location = useLocation();
  const { key } = location;
  // Typed any by the router: anything may have been pushed with the address.
  const state: unknown = location.state;
  const asked = typeof state === "object" && state !== null && "focusHeading" in state;
  useEffect(() => {
    if (asked) heading.current?.focus({ preventScroll: true });
  }, [key, asked]);
  return heading;
}
