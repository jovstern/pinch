import type { ComponentProps } from "react";
import { cn } from "../lib/cn.ts";
import { useDarkTheme } from "../lib/theme.ts";

// The "Pinch" wordmark (D24) as a file in public/, in the dark theme's accent in the dark theme:
// the header's and "We couldn't reach Pinch"'s. One <img> whose file follows the theme, not a
// <picture> (its media query can't follow a choice made in the menu) nor two <img>s, one hidden
// (a hidden image may still be fetched): the theme is set before the first render (index.html's
// script), so the right file is the first asked for, and only it. Its width and height are set,
// so nothing moves as it loads or as the theme changes.
export function Logo({ className, ...props }: ComponentProps<"img">) {
  const dark = useDarkTheme();
  return (
    <img
      src={dark ? "/logo-dark.svg" : "/logo.svg"}
      alt="Pinch"
      width={79}
      height={32}
      className={cn("w-auto", className)}
      {...props}
    />
  );
}
