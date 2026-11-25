import { useId, type ReactNode } from "react";
import { pageIsRtl } from "../i18n.ts";
import { InfoButton } from "./InfoButton.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/Popover.tsx";

export type InfoPopoverProps = {
  // The (i)'s name, and the popover's title.
  label: string;
  // Which end of the (i) the popover lines up with: "start" opens it over the row's content.
  align: "start" | "end";
  children: ReactNode;
};

// The (i)'s popover (design §14): a title and a few lines, opened by a tap, a click or a key, as a
// tooltip can't be opened by touch. Loaded on the (i)'s first press (LazyInfoPopover), and open as
// it appears.
export function InfoPopover({ label, align, children }: InfoPopoverProps) {
  const titleId = useId();
  return (
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <InfoButton label={label} />
      </PopoverTrigger>
      {/* Its words read in the page's direction, set inside it: a dir on the content would reach
          Radix's positioning, which reads "end" as the left in RTL. A fixed width, never wider
          than the screen. */}
      <PopoverContent
        align={align}
        aria-labelledby={titleId}
        className="w-80 max-w-[calc(100vw-2rem)]"
      >
        <div dir={pageIsRtl() ? "rtl" : "ltr"}>
          {/* In the body's face, as the Filters panel's heading: a small title, not a page's. */}
          <h2 id={titleId} className="font-sans font-semibold">
            {label}
          </h2>
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}
