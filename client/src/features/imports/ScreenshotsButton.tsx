import { SCREENSHOT_TYPES } from "@pinch/shared";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

type ScreenshotsButtonProps = {
  sending: boolean;
  // The message under the box, when the last pick has one.
  describedBy: string | undefined;
  onChoose: (files: File[]) => void;
};

// The paste box's picture button (design §14): it opens the file picker for photos or screenshots
// of a recipe (useScreenshotsUpload). A label with the file input hidden inside it, so the label
// shows the input's focus (as TagPicker's chips); the ring is drawn inside it, clear of the box's
// edge. 44 px, for a finger.
export function ScreenshotsButton({ sending, describedBy, onChoose }: ScreenshotsButtonProps) {
  const { t } = useTranslation();
  const name = sending ? t("imports.sending") : t("imports.uploadPhoto");
  return (
    <label
      // The icon's name for a mouse, as the hidden words are for a screen reader.
      title={name}
      className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-control text-muted-foreground hover:text-foreground has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ring"
    >
      {sending ? (
        <LoaderCircle aria-hidden="true" className="size-5 motion-safe:animate-spin" />
      ) : (
        <ImagePlus aria-hidden="true" className="size-5" />
      )}
      <span className="sr-only">{name}</span>
      <input
        type="file"
        multiple
        accept={SCREENSHOT_TYPES.join(",")}
        className="sr-only"
        aria-disabled={sending}
        aria-describedby={describedBy}
        onChange={(event) => {
          onChoose([...(event.target.files ?? [])]);
          // Empty again, so choosing the same files twice still sends them.
          event.target.value = "";
        }}
      />
    </label>
  );
}
