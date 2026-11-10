import { useSyncExternalStore } from "react";

// Whether the screen matches a media query, read again as it changes (a turned phone, a resized
// window): for the few things CSS alone can't switch.
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const media = matchMedia(query);
      media.addEventListener("change", onChange);
      return () => {
        media.removeEventListener("change", onChange);
      };
    },
    () => matchMedia(query).matches,
  );
}
