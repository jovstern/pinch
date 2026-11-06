import { fieldErrors, ImportInputSchema, ImportSchema, type ImportInput } from "@pinch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Button } from "../../components/Button.tsx";
import { FieldError } from "../../components/FieldError.tsx";
import { ApiError, sendJson } from "../../lib/api.ts";
import { importListQuery } from "./importQueries.ts";

// The main action on / (design §14): paste a link, and the worker turns it into a draft
// (§4.1). The link is checked with the API's schema before it's sent.
export function ImportLinkForm() {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const creation = useMutation({
    mutationFn: (input: ImportInput) => sendJson("POST", "/api/imports", input, ImportSchema),
    onSuccess: () => {
      setUrl("");
      // The new import shows in the list, which starts polling.
      void queryClient.invalidateQueries({ queryKey: importListQuery.queryKey });
    },
    onError: (failure) => {
      const message = failure instanceof ApiError ? failure.fields.url : undefined;
      setError(message ?? "We couldn't send this link. Try again.");
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        // Not disabled while sending, so focus stays on the button (as Show more).
        if (creation.isPending) return;
        const result = ImportInputSchema.safeParse({ url });
        if (!result.success) {
          setError(fieldErrors(result.error).url ?? null);
          return;
        }
        setError(null);
        creation.mutate(result.data);
      }}
      className="mt-6"
    >
      <label htmlFor={inputId} className="mb-1 block font-semibold">
        Pinch a recipe from a reel
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          inputMode="url"
          autoComplete="off"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
          }}
          placeholder="Paste an Instagram, Facebook or YouTube link"
          aria-invalid={error !== null}
          aria-describedby={error === null ? undefined : errorId}
          className="min-h-11 w-full rounded-lg border border-border bg-surface-raised px-3 py-2 aria-invalid:border-danger"
        />
        <Button type="submit" variant="primary" className="shrink-0">
          {creation.isPending ? "Sending…" : "Pinch it"}
        </Button>
      </div>
      <FieldError errors={error === null ? [] : [error]} id={errorId} />
    </form>
  );
}
