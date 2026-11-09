import {
  dailyLimitMessage,
  ImportSchema,
  MAX_SCREENSHOT_BYTES,
  MAX_SCREENSHOTS,
  screenshotsMessage,
} from "@pinch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { ApiError, sendForm } from "../../lib/api.ts";
import { importListQuery } from "./importQueries.ts";

// The second way in on / (design §1, §14): screenshots of a post whose link and text won't do.
// Choosing them sends them at once: no second button to press. Checked here first, with the
// API's own limits, so a wrong pick is said before anything is sent.
export function ScreenshotsUpload() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string>();
  const hintId = useId();
  const upload = useMutation({
    mutationFn: (files: File[]) => {
      const form = new FormData();
      for (const file of files) form.append("images", file);
      return sendForm("/api/imports/screenshots", form, ImportSchema);
    },
    onSuccess: () => {
      // The new import shows in the list, which starts polling.
      void queryClient.invalidateQueries({ queryKey: importListQuery.queryKey });
    },
    onError: (error) => {
      setMessage(sendFailure(error));
    },
  });

  function choose(files: File[]) {
    if (files.length === 0) return;
    if (files.length > MAX_SCREENSHOTS || files.some((file) => file.size > MAX_SCREENSHOT_BYTES)) {
      setMessage(screenshotsMessage);
      return;
    }
    setMessage(undefined);
    upload.mutate(files);
  }

  return (
    <div className="mt-3">
      {/* A label drawn as a secondary button: the file input inside it is hidden, so the label
          shows its focus (as TagPicker's chips). */}
      <label className="inline-flex min-h-11 cursor-pointer items-center rounded-control bg-fill px-4 font-semibold hover:bg-border has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-strong">
        {upload.isPending ? "Sending…" : "Or add screenshots"}
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-describedby={hintId}
          onChange={(event) => {
            choose([...(event.target.files ?? [])]);
            // Empty again, so choosing the same files twice still sends them.
            event.target.value = "";
          }}
        />
      </label>
      <p id={hintId} className="mt-1 text-sm text-text-muted">
        Up to {MAX_SCREENSHOTS} screenshots of the recipe, when its link and text won't do.
      </p>
      {message && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {message}
        </p>
      )}
    </div>
  );
}

// As the paste box's: the API's message for the files, the day's cap, or a plain retry.
function sendFailure(error: Error) {
  if (error instanceof ApiError) {
    if (error.fields.images) return error.fields.images;
    if (error.status === 429) return dailyLimitMessage;
  }
  return "We couldn't send these. Try again.";
}
