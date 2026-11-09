import type { Thumbnail as ThumbnailSize } from "@pinch/shared";

type ThumbnailProps = {
  // GET /api/recipes/:id/thumbnail or /api/imports/:id/thumbnail (design §5).
  src: string;
  // Its size, from the API: the box is kept before the image loads, so nothing below it jumps.
  size: ThumbnailSize;
  className?: string;
  // Lazy where many may be off screen (the list); at once at the top of a page.
  loading?: "lazy" | "eager";
};

// A recipe's picture, from its post. Decorative (alt=""): its title is always beside it.
export function Thumbnail({ src, size, className = "", loading = "eager" }: ThumbnailProps) {
  return (
    <img
      src={src}
      alt=""
      width={size.width}
      height={size.height}
      loading={loading}
      className={`rounded-card bg-fill object-cover ${className}`}
    />
  );
}
