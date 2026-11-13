import { messages } from "@pinch/shared";
import i18next from "i18next";
import type { ReactNode } from "react";

type MessageKey = keyof typeof messages;

// Each of shared's messages' names, by its English text.
const keys = new Map(
  Object.entries(messages).map(([key, text]) => [text as string, key as MessageKey]),
);

// A message the server wrote, in English (design §16.7, D44): a field's, from the shared schemas
// (the form's own check or the API's 400), or why an import failed (the worker's). Said by its
// name, in the page's language. One it doesn't know (worded before a change, or new) is shown as
// it came, in English: marked so, so a Hebrew page reads it in English and keeps its period at
// its end.
export function serverMessage(text: string): ReactNode {
  const key = keys.get(text);
  if (key === undefined) {
    return (
      <span lang="en" dir="ltr">
        {text}
      </span>
    );
  }
  return i18next.t(`validation.${key}`);
}
