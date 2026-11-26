import { useEffect } from "react";
import { NavigationType, useLocation, useNavigationType } from "react-router";

// A page opened by a link starts at its top: the router keeps the scroll, so a recipe opened from
// the foot of another (Similar recipes, design D51) showed its own foot. An effect: the window's
// scroll is outside React. Only for a new entry (PUSH): Back and Forward are left to the browser,
// which puts the page where it was, and a change of the same page's query (the people picker,
// the filters: REPLACE, or the same pathname) doesn't move it.
export function useScrollToTop() {
  const { pathname } = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    if (type === NavigationType.Push) window.scrollTo(0, 0);
  }, [pathname, type]);
}
