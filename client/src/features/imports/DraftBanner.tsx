import type { Import } from "@pinch/shared";
import { ExternalLink, Sparkles } from "lucide-react";
import { platformNames } from "../../lib/platformNames.ts";

// At the top of a draft (design §14, shadcn's Alert): where Pinch read it, and the way back to
// the post to compare. The things to look at are counted under it, and marked on their fields
// (RecipeForm).
export function DraftBanner({ input }: { input: Import["input"] }) {
  return (
    <div className="flex gap-3 rounded-card border border-border p-4">
      <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold">Pinch read this from {readFrom(input)}</p>
        <p className="text-sm text-muted-foreground">Check it, then save.</p>
        {/* A new tab: going to the post here would lose what was typed. */}
        {input.type === "link" && (
          <a
            href={input.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1 text-sm underline underline-offset-4 hover:text-foreground"
          >
            Watch the video
            <span className="sr-only"> (opens in a new tab)</span>
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function readFrom(input: Import["input"]) {
  if (input.type === "link") return platformNames[input.platform];
  if (input.type === "text") return "the text you pasted";
  return "your screenshots";
}
