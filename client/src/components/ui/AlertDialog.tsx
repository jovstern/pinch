import type { ComponentProps } from "react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { cn } from "../../lib/cn.ts";

// shadcn/ui's AlertDialog (D26), on Pinch's tokens: a question that must be answered before going
// on (focus kept inside, Escape, screen readers). Over the editor's pinned Save bar (z-50, as
// shadcn's). The parts Pinch uses; the content is the one shell every question shares.
export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogTitle = AlertDialogPrimitive.Title;
export const AlertDialogDescription = AlertDialogPrimitive.Description;
export const AlertDialogCancel = AlertDialogPrimitive.Cancel;
export const AlertDialogAction = AlertDialogPrimitive.Action;

export function AlertDialogContent({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim/50" />
      <AlertDialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-[min(90vw,28rem)] -translate-1/2 rounded-card border border-border bg-surface-raised p-6 shadow-sheet",
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}
