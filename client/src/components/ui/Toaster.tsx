import { CircleCheck, TriangleAlert } from "lucide-react";
import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";
import { Toaster as Sonner } from "sonner";

// md: Tailwind's 768 px, where the toasts move from the top to the bottom right (design §14).
const wide = "(min-width: 48rem)";

function subscribe(onChange: () => void) {
  const media = matchMedia(wide);
  media.addEventListener("change", onChange);
  return () => {
    media.removeEventListener("change", onChange);
  };
}

// shadcn's Sonner (its toast), on Pinch's tokens. Mounted once, in the Layout.
// Placed by width in JS, not CSS: Sonner takes one position, and its own phone rule (under
// 600 px) keeps it, so a bottom-right Toaster would sit at the bottom on a phone, over the
// floating button and the thumb. The media query is read as it changes: a turned phone follows.
export function Toaster() {
  const isWide = useSyncExternalStore(subscribe, () => matchMedia(wide).matches);
  return (
    <Sonner
      position={isWide ? "bottom-right" : "top-center"}
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
        // link-like button, as in the wireframe, 44 px tall for a thumb (ui-craft).
        classNames: {
          toast: "shadow-sheet! text-sm!",
          title: "font-semibold!",
          description: "text-muted-foreground!",
          actionButton:
            "h-11! bg-transparent! px-3! text-sm! font-semibold! text-primary! underline! underline-offset-4",
        },
      }}
    />
  );
}
