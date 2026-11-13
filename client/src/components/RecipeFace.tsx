import { CookingPot, Sparkles } from "lucide-react";
import { cn } from "../lib/cn.ts";

type RecipeFaceProps = {
  // The recipe's or the draft's (D25); none: a recipe saved before emojis, or a title the server
  // didn't know.
  emoji: string | undefined;
  // From a reel (Instagram, YouTube, Facebook): without its emoji, the pot gets Pinch's sparkles,
  // as a video's draft does while it cooks.
  fromVideo: boolean;
  // The tile's shape and the face's size (a text size), which each place sets for its tile. The
  // icons are sized in em, so they follow it.
  className: string;
};

// A recipe's face when it has no picture (design §14, D25): its emoji on a soft tile; without
// one, a cooking pot, with sparkles when it came from a video. Decorative, as a picture is: the
// title beside it names the dish.
export function RecipeFace({ emoji, fromVideo, className }: RecipeFaceProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center bg-muted font-emoji leading-none select-none",
        className,
      )}
    >
      {emoji ?? (
        <span className="relative text-muted-foreground">
          <CookingPot className="size-[1em]" strokeWidth={1.5} />
          {fromVideo && <Sparkles className="absolute -end-[0.4em] -top-[0.15em] size-[0.45em]" />}
        </span>
      )}
    </div>
  );
}
