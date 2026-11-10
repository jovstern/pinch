import { useRef } from "react";
import { useHeadingFocus } from "../../lib/useHeadingFocus.ts";
import { ImportForm } from "./ImportForm.tsx";
import { ImportList } from "./ImportList.tsx";
import { ScreenshotsUpload } from "./ScreenshotsUpload.tsx";

// The New recipe tab, at / (design §14, D24): paste a link or a post's text (or add
// screenshots), and the queue of what's being turned into recipes.
export function ImportPage() {
  // The paste box, where focus goes after an import is retried or dismissed.
  const pasteBoxRef = useRef<HTMLTextAreaElement>(null);
  const headingRef = useHeadingFocus();
  return (
    <>
      <title>New recipe · Pinch</title>
      {/* The selected tab names the page on screen; the heading names it for screen readers. */}
      <h1 ref={headingRef} tabIndex={-1} className="sr-only">
        New recipe
      </h1>
      <ImportForm inputRef={pasteBoxRef} />
      <ScreenshotsUpload />
      <ImportList focusPasteBox={() => pasteBoxRef.current?.focus()} />
    </>
  );
}
