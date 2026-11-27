import {
  ImportSchema,
  MAX_SCREENSHOT_BYTES,
  MAX_SCREENSHOTS,
  SCREENSHOT_TYPES,
} from "@pinch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18next from "i18next";
import { useState, type ReactNode } from "react";
import { ApiError, sendForm } from "../../lib/api.ts";
import { serverMessage } from "../../lib/serverMessage.tsx";
import { toastPinching } from "../../lib/toasts.tsx";
import { cancelImport, importListQuery, limitNote } from "./importQueries.ts";

// The second way in on / (design §1, §14): photos or screenshots of a recipe, for a post whose
// link and text won't do, or a recipe on paper. The paste box's picture button picks them
// (ScreenshotsButton), and the box says what went wrong under itself (ImportForm).
// Choosing them sends them at once: the picker's Open is the confirm. Checked here first, with
// the API's own limits, so a wrong pick is said before anything is sent.
export function useScreenshotsUpload() {
  const queryClient = useQueryClient();
  // Only the local check is kept; the send's failure is the mutation's own.
  const [refused, setRefused] = useState(false);
  const upload = useMutation({
    mutationFn: (files: File[]) => {
      const form = new FormData();
      for (const file of files) form.append("images", file);
      return sendForm("/api/imports/screenshots", form, ImportSchema);
    },
    onSuccess: (job) => {
      // The new import shows in the list, which starts polling.
      void queryClient.invalidateQueries({ queryKey: importListQuery.queryKey });
      toastPinching(() => cancelImport(queryClient, job.id));
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

  // A day's limit is a quiet note, as the paste's own; the rest are errors.
  const limit = refused ? undefined : limitNote(upload.error);
  return {
    choose,
    sending: upload.isPending,
    limit,
    error: limit ? undefined : errorMessage(refused, upload.error),
  };
}

// The pick refused here, or as the paste box says a failed send: the API's message for the
// files, or a plain retry. The files' message is shared's, said in the page's language (design
// §16.7).
function errorMessage(refused: boolean, error: Error | null): ReactNode {
  if (refused) return i18next.t("validation.screenshots");
  if (!error) return undefined;
  if (error instanceof ApiError && error.fields.images) return serverMessage(error.fields.images);
  return i18next.t("imports.couldntSendThese");
}
