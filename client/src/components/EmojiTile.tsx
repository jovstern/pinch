import { cn } from "../lib/cn.ts";

type EmojiTileProps = {
  // The recipe's or the draft's; none (a recipe saved before emojis, or a title the server
  // didn't know): a plate.
  emoji: string | undefined;
  // The tile's shape and the emoji's size (a text size), which each place sets for its tile.
  className: string;
};

// A recipe's face when it has no picture (design D25): its emoji, centred on a soft tile.
// Decorative, as a picture is: the title beside it names the dish.
export function EmojiTile({ emoji = "🍽️", className }: EmojiTileProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center bg-muted leading-none select-none",
        className,
      )}
    >
      {emoji}
    </div>
  );
}
