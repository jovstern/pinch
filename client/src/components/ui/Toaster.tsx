import { CircleCheck, TriangleAlert } from "lucide-react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Toaster as Sonner } from "sonner";
import { pageIsRtl } from "../../i18n.ts";
import { useMediaQuery } from "../../lib/useMediaQuery.ts";

// md: Tailwind's 768 px, where the toasts move from the top to the bottom corner on the end side:
// the right, or the left in Hebrew (design §14, §16.4).
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
// alwaysTop keeps them at the top on every width (the page says why: Layout).
export function Toaster({ alwaysTop }: { alwaysTop: boolean }) {
  const { t } = useTranslation();
  const atBottom = useMediaQuery(wide) && !alwaysTop;
  const rtl = pageIsRtl();
  return (
    <Sonner
      dir={rtl ? "rtl" : "ltr"}
      position={atBottom ? (rtl ? "bottom-left" : "bottom-right") : "top-center"}
      // Both: Sonner's phone rule (mobileOffset) stops at 600 px, the header's at 768.
      offset={atBottom ? undefined : belowHeader}
      mobileOffset={belowHeader}
      // Sonner's own dark colours (the close button's hover) follow the system, as Pinch's do.
      theme="system"
      // Sonner's own words, which a screen reader says: the region, and each toast's ✕.
      containerAriaLabel={t("toasts.region")}
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
        closeButtonAriaLabel: t("toasts.close"),
        // Important (!): Sonner's own rules are more specific than a utility. The action is a
        // link-like button, as in the wireframe, 44 px tall for a thumb (ui-craft); the close
        // button stays a small mark but takes 44 px of touch (the after: around it), inside the
        // top corner on the end side rather than astride the start one, with room kept for it
        // (pe-8). Logical (end, start, pe), so Hebrew mirrors it (design §16.4).
        // On a phone a description keeps to one line, so a toast covers less of the page (the
        // card says the rest).
        classNames: {
          toast: `shadow-sheet! text-sm! has-[[data-close-button]]:pe-8! ${focusRing}`,
          title: "font-semibold!",
          description: "text-muted-foreground! max-md:line-clamp-1!",
          actionButton: `h-11! bg-transparent! px-3! text-sm! font-semibold! text-primary! underline! underline-offset-4 ${focusRing}`,
          closeButton: `start-auto! end-1.5! top-1.5! transform-none! after:absolute after:-inset-3.5 after:content-[''] ${focusRing}`,
        },
      }}
    />
  );
}
