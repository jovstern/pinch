import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/AlertDialog.tsx";
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

// Leaving the editor loses what's in it, so it asks once first (design §14). Opened by its own
// trigger, so focus goes back to it on Keep.
export function LeaveDialog({
  trigger,
  title,
  description,
  confirmLabel,
  keepLabel,
  onConfirm,
}: LeaveDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle className="text-lg font-semibold">{title}</AlertDialogTitle>
        <AlertDialogDescription dir="auto" className="mt-2 text-pretty text-text-muted">
          {description}
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="secondary">{keepLabel}</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
