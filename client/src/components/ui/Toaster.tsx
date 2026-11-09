import { CircleCheck, TriangleAlert } from "lucide-react";
import type { CSSProperties } from "react";
import { Toaster as Sonner } from "sonner";
import { useMediaQuery } from "../../lib/useMediaQuery.ts";

// md: Tailwind's 768 px, where the toasts move from the top to the bottom right (design §14).
const wide = "(min-width: 48rem)";
// On a phone, under the header (its tabs, 64 px), so a toast never covers them.
const belowHeader = { top: "4.5rem" };
// The app's one focus ring (globals.css), which Sonner's own outline: none hides.
const focusRing =
  "focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-ring!";

// shadcn's Sonner (its toast), on Pinch's tokens. Mounted once, in the Layout.
// Placed by width in JS, not CSS: Sonner takes one position, and its own phone rule (under
// 600 px) keeps it, so a bottom-right Toaster would sit at the bottom on a phone, over the
// floating button and the thumb. The media query is read as it changes: a turned phone follows.
export function Toaster() {
  const isWide = useMediaQuery(wide);
  return (
    <Sonner
      position={isWide ? "bottom-right" : "top-center"}
      // Both: Sonner's phone rule (mobileOffset) stops at 600 px, the header's at 768.
      offset={isWide ? undefined : belowHeader}
      mobileOffset={belowHeader}
      // Sonner's own dark colours (the close button's hover) follow the system, as Pinch's do.
      theme="system"
      icons={{
        success: <CircleCheck className="size-4 text-primary" />,
        error: <TriangleAlert className="size-4 text-destructive" />,
      }}
      // Sonner's own colours read these; the tokens follow the theme (globals.css).
      style={
        {
          "--normal-bg": "var(--color-popover)",
          "--normal-text": "var(--color-popover-foreground)",
          "--normal-border": "var(--color-border)",
          "--border-radius": "var(--radius-card)",
        } as CSSProperties
      }
      toastOptions={{
        // Important (!): Sonner's own rules are more specific than a utility. The action is a
        // link-like button, as in the wireframe, 44 px tall for a thumb (ui-craft); the close
        // button stays a small mark but takes 44 px of touch (the after: around it).
        classNames: {
          toast: `shadow-sheet! text-sm! ${focusRing}`,
          title: "font-semibold!",
          description: "text-muted-foreground!",
          actionButton: `h-11! bg-transparent! px-3! text-sm! font-semibold! text-primary! underline! underline-offset-4 ${focusRing}`,
          closeButton: `after:absolute after:-inset-3.5 after:content-[''] ${focusRing}`,
        },
      }}
    />
  );
}
