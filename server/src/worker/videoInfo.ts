import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

const run = promisify(execFile);

// Its own timeout inside the attempt's deadline (§4.3): a YouTube short takes about 4 s.
const YTDLP_TIMEOUT_MS = 30_000;

// yt-dlp's JSON lists every format of the video: often 0.5–2 MB.
const YTDLP_MAX_OUTPUT = 20_000_000;

// What yt-dlp says about a post. Instagram gives no length (design §4.1), so it can be missing.
export type VideoInfo = { seconds?: number; caption: string };

// The two fields we read from yt-dlp's JSON; it has many more.
const YtDlpInfoSchema = z.object({
  duration: z.number().nullish(),
  description: z.string().nullish(),
});

// Reads a post's length and caption without downloading it (§4.1): the caption often holds
// the recipe with its quantities (D15), and a long video is turned down before Gemini sees it.
export async function readVideoInfo(url: string, signal: AbortSignal): Promise<VideoInfo> {
  const { stdout } = await run(
    "yt-dlp",
    // --no-playlist: the video in the link, not the playlist it may also name. --playlist-items 1:
    // a link to a playlist or channel reads its first video, not all of them. "--": the link is
    // never read as an option.
    ["--no-warnings", "--no-playlist", "--playlist-items", "1", "--dump-json", "--", url],
    { signal, timeout: YTDLP_TIMEOUT_MS, maxBuffer: YTDLP_MAX_OUTPUT },
  );
  return parseVideoInfo(stdout);
}

export function parseVideoInfo(json: string): VideoInfo {
  const info = YtDlpInfoSchema.parse(JSON.parse(json));
  return { seconds: info.duration ?? undefined, caption: info.description ?? "" };
}
