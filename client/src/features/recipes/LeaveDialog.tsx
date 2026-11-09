import { AlertDialog } from "radix-ui";
import type { ReactNode } from "react";
import { Button } from "../../components/ui/Button.tsx";

type LeaveDialogProps = {
  // The button that opens it (a draft's Discard).
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  keepLabel: string;
  onConfirm: () => void;
};

// Leaving the editor loses what's in it, so it asks once first (design §14). A Radix dialog
// (focus, Escape, screen readers), opened by its own trigger, so focus goes back to it on Keep.
export function LeaveDialog({
  trigger,
  title,
  description,
  confirmLabel,
  keepLabel,
  onConfirm,
}: LeaveDialogProps) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-scrim/50" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(90vw,28rem)] -translate-1/2 rounded-card border border-border bg-surface-raised p-6 shadow-sheet">
          <AlertDialog.Title className="text-lg font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description dir="auto" className="mt-2 text-pretty text-text-muted">
            {description}
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">{keepLabel}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant="destructive" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
