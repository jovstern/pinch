// The shared type is also called Thumbnail: here it's the picture's size.
import type { Thumbnail as ThumbnailSize } from "@pinch/shared";

type ThumbnailProps = {
  // GET /api/recipes/:id/thumbnail or /api/imports/:id/thumbnail (design §5).
  src: string;
  size: ThumbnailSize;
  // "tile": a small 4:5 crop, for a card (lazy: many may be off screen). "full": the picture at
  // its own shape, as wide as the column allows and no taller than 16rem, for the top of a page.
  shape: "tile" | "full";
  className?: string;
};

// A recipe's picture, from its post. Decorative (alt=""): its title is always beside it. Its box
// is the right size before the image loads (width and height from the API), so nothing jumps.
export function Thumbnail({ src, size, shape, className = "" }: ThumbnailProps) {
  return (
    <img
      src={src}
      alt=""
      width={size.width}
      height={size.height}
      loading={shape === "tile" ? "lazy" : "eager"}
      // "full" gets a width, not w-auto: with both sides auto, the box stays empty until the
      // image arrives. The height then follows from width and height.
      style={
        shape === "full"
          ? { width: `min(100%, ${String((16 * size.width) / size.height)}rem)` }
          : undefined
      }
      className={`rounded-card bg-fill object-cover ${shape === "tile" ? "h-20 w-16 shrink-0" : "h-auto"} ${className}`}
    />
  );
}
