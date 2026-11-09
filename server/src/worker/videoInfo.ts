import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { NoRetryError } from "./workLoop.ts";

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

// A download's own timeout inside the attempt's deadline (§4.3): the spike's reels (3–11 MB)
// took a few seconds each.
const DOWNLOAD_TIMEOUT_MS = 60_000;

// Reels are small (the spike's were 3–11 MB): a bigger file isn't a short recipe video.
const MAX_DOWNLOAD = "100M";

export const TOO_BIG = "This video is too big. Pinch reads short ones.";

// Downloads an Instagram or Facebook post's video into `dir` and reads its info in the same
// call (§4.1): one request to the platform, not two. Returns where the .mp4 is; the caller
// deletes the folder.
export async function downloadVideo(
  url: string,
  dir: string,
  signal: AbortSignal,
): Promise<VideoInfo & { path: string }> {
  const { stdout } = await run(
    "yt-dlp",
    // As readVideoInfo, plus: --no-simulate downloads even though the info is printed;
    // --remux-video mp4 makes it an .mp4 without re-encoding, as video.mp4.
    [
      "--no-warnings",
      "--no-playlist",
      "--playlist-items",
      "1",
      "--dump-json",
      "--no-simulate",
      "--max-filesize",
      MAX_DOWNLOAD,
      "--remux-video",
      "mp4",
      "-o",
      join(dir, "video.%(ext)s"),
      "--",
      url,
    ],
    { signal, timeout: DOWNLOAD_TIMEOUT_MS, maxBuffer: YTDLP_MAX_OUTPUT },
  );
  const path = join(dir, "video.mp4");
  // Past --max-filesize, yt-dlp skips the download and still succeeds: no file.
  if (!existsSync(path)) throw new NoRetryError(TOO_BIG);
  return { ...parseVideoInfo(stdout), path };
}

// The length of a downloaded video, with ffprobe: Instagram doesn't say it before (§4.1).
export async function measureSeconds(path: string, signal: AbortSignal): Promise<number> {
  const { stdout } = await run(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
    { signal, timeout: YTDLP_TIMEOUT_MS },
  );
  const seconds = Number(stdout.trim());
  if (!Number.isFinite(seconds)) throw new Error(`ffprobe gave no length: "${stdout.trim()}"`);
  return seconds;
}
