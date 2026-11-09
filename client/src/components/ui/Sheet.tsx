import type { ComponentProps } from "react";
import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { cn } from "../../lib/cn.ts";
import { Button } from "./Button.tsx";

// shadcn/ui's Sheet (D26), on Pinch's tokens: a Radix Dialog (focus kept inside, Escape, focus
// back to its trigger) drawn as a panel from the bottom, over the page's floating button (z-50,
// as shadcn's). Only the bottom side, the one Pinch uses.
export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;
export const SheetTitle = SheetPrimitive.Title;

// Up to 85% of the screen, so the page above shows it's still there; the content scrolls inside.
export function SheetContent({
  className,
  children,
  ...props
}: ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim/50" />
      <SheetPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-card bg-popover text-popover-foreground shadow-sheet",
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close asChild>
          <Button variant="ghost" aria-label="Close" className="absolute top-2 right-2 px-3">
            <X aria-hidden="true" className="size-5" />
          </Button>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
