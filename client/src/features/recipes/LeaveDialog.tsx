import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "../../components/ui/AlertDialog.tsx";
import { Button } from "../../components/ui/Button.tsx";

type LeaveDialogProps = {
  title: string;
  // A sentence, which may hold the draft's title in its own <bdi> (InSentence, design §16.5).
  description: ReactNode;
  confirmLabel: string;
  keepLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  // Where focus goes when it closes: the button that opened it (RecipeForm's LeaveButton), as
  // for DeleteRecipeDialog, which has no Trigger either.
  focusOnClose: () => void;
};

// Leaving the editor loses what's in it, so it asks once first (design §14).
export function LeaveDialog({
  title,
  description,
  confirmLabel,
  keepLabel,
  onConfirm,
  onClose,
  focusOnClose,
}: LeaveDialogProps) {
  return (
    // Open while it's on the page; closing (Keep, Escape, the answer) asks to be taken away.
    <AlertDialog
      open
      onOpenChange={(opening) => {
        if (!opening) onClose();
      }}
    >
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          focusOnClose();
        }}
      >
        <AlertDialogTitle className="text-lg font-semibold">{title}</AlertDialogTitle>
        <AlertDialogDescription className="mt-2 text-pretty text-text-muted">
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
