// The shared type is also called Thumbnail: here it's the picture's size.
import type { Thumbnail as ThumbnailSize } from "@pinch/shared";
import { useState } from "react";

type ThumbnailProps = {
  // GET /api/recipes/:id/thumbnail or /api/imports/:id/thumbnail (design §5).
  src: string;
  size: ThumbnailSize;
  // "tile": a small 4:5 crop, for a card (lazy: many may be off screen). "cover": fills the box
  // it's in, cropped, for a card that is mostly picture (lazy too). "full": the picture at its
  // own shape, as wide as the column allows and no taller than 16rem, for the top of a page.
  // "banner": a recipe's (design §14): a 5:4 band, edge to edge on a phone; from 1024 px 320 px
  // wide beside the title, at its own shape, no taller than 4:5.
  shape: "tile" | "cover" | "full" | "banner";
  // A tile or cover at the top of its page (My recipes' first row): loaded as "full" and
  // "banner" are.
  eager?: boolean;
  className?: string;
};

// A small tile gets the control's radius: the card's would make it look like a pill. A cover's
// box is its card's, which has the fill already.
const shapeClasses = {
  tile: "h-20 w-16 shrink-0 rounded-control bg-fill",
  cover: "size-full",
  full: "h-auto rounded-card bg-fill",
  // The negative margins undo Layout's px-4 on a phone (change both together, as TagChips);
  // max-w-none undoes Tailwind's img max-width: 100%, which would hold it in the gutter. Its height
  // stays Tailwind's auto, so the aspect class sets it (on a phone), or its own width and height
  // do (from 1024 px, aspect-auto).
  banner:
    "-mx-4 aspect-5/4 w-[calc(100%+2rem)] max-w-none bg-fill sm:mx-0 sm:max-h-96 sm:w-full sm:rounded-card lg:aspect-auto lg:max-h-100 lg:w-80 lg:shrink-0",
};

// A recipe's picture, from its post. Decorative (alt=""): its title is always beside it. Its box
// is the right size before the image loads (width and height from the API), so nothing jumps.
export function Thumbnail({ src, size, shape, eager = false, className = "" }: ThumbnailProps) {
  // A picture that doesn't load (gone, offline) is as no picture: no broken-image icon. Kept by
  // its address, so another picture in the same place is tried.
  const [failedSrc, setFailedSrc] = useState<string>();
  if (failedSrc === src) return null;
  // The top of a page: often its largest thing, and the last to arrive (page, JS, data, then it).
  const onTop = shape === "full" || shape === "banner" || eager;
  return (
    <img
      src={src}
      alt=""
      width={size.width}
      height={size.height}
      loading={onTop ? "eager" : "lazy"}
      // So it's asked for first among what's left.
      fetchPriority={onTop ? "high" : "auto"}
      onError={() => {
        setFailedSrc(src);
      }}
      // "full" gets a width, not w-auto: with both sides auto, the box stays empty until the
      // image arrives. The height then follows from width and height.
      style={
        shape === "full"
          ? { width: `min(100%, ${String((16 * size.width) / size.height)}rem)` }
          : undefined
      }
      className={`object-cover ${shapeClasses[shape]} ${className}`}
    />
  );
}
