import {
  dailyLimitMessage,
  ImportSchema,
  MAX_SCREENSHOT_BYTES,
  MAX_SCREENSHOTS,
  SCREENSHOT_TYPES,
  screenshotsMessage,
} from "@pinch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "../../components/ui/Button.tsx";
import { ApiError, sendForm } from "../../lib/api.ts";
import { importListQuery } from "./importQueries.ts";

// The second way in on / (design §1, §14): screenshots of a post whose link and text won't do.
// Choosing them sends them at once: the picker's Open is the confirm. Checked here first, with
// the API's own limits, so a wrong pick is said before anything is sent.
export function ScreenshotsUpload() {
  const queryClient = useQueryClient();
  // Only the local check is kept; the send's failure is the mutation's own.
  const [refused, setRefused] = useState(false);
  const hintId = useId();
  const errorId = useId();
  const upload = useMutation({
    mutationFn: (files: File[]) => {
      const form = new FormData();
      for (const file of files) form.append("images", file);
      return sendForm("/api/imports/screenshots", form, ImportSchema);
    },
    onSuccess: () => {
      // The new import shows in the list, which starts polling and announces it.
      void queryClient.invalidateQueries({ queryKey: importListQuery.queryKey });
    },
  });

  function choose(files: File[]) {
    // One send at a time, as the paste box: a pick while sending would make a second import.
    if (files.length === 0 || upload.isPending) return;
    const fits =
      files.length <= MAX_SCREENSHOTS &&
      files.every(
        (file) => file.size <= MAX_SCREENSHOT_BYTES && SCREENSHOT_TYPES.includes(file.type),
      );
    setRefused(!fits);
    // A new send clears the last one's failure.
    if (fits) upload.mutate(files);
  }

  const message = errorMessage(refused, upload.error);
  return (
    <div className="mt-2">
      {/* Quiet, under the field: the paste is the main way in (design §14). A label with
          Button's ghost look: the file input inside it is hidden, so the label
          shows its focus (as TagPicker's chips), and relative keeps the input inside it. */}
      <Button asChild variant="ghost">
        <label className="relative -ml-2 cursor-pointer px-2 text-sm font-medium text-muted-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring">
          <ImagePlus aria-hidden="true" className="size-4" />
          {upload.isPending ? "Sending…" : "Or add screenshots"}
          <input
            type="file"
            multiple
            accept={SCREENSHOT_TYPES.join(",")}
            className="sr-only"
            aria-disabled={upload.isPending}
            aria-describedby={message ? `${hintId} ${errorId}` : hintId}
            onChange={(event) => {
              choose([...(event.target.files ?? [])]);
              // Empty again, so choosing the same files twice still sends them.
              event.target.value = "";
            }}
          />
        </label>
      </Button>
      <p id={hintId} className="text-sm text-text-muted">
        Up to {MAX_SCREENSHOTS} screenshots of the recipe, when its link and text won't do.
      </p>
      {message && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-danger">
          {message}
        </p>
      )}
    </div>
  );
}

// The pick refused here, or as the paste box says a failed send: the API's message for the
// files, the day's cap, or a plain retry.
function errorMessage(refused: boolean, error: Error | null) {
  if (refused) return screenshotsMessage;
  if (!error) return undefined;
  if (error instanceof ApiError) {
    if (error.fields.images) return error.fields.images;
    if (error.status === 429) return dailyLimitMessage;
  }
  return "We couldn't send these. Try again.";
}
