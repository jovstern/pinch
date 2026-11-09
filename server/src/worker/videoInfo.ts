import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
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
    // --ignore-config: no config file on the machine changes what it does. --no-playlist: the
    // video in the link, not the playlist it may also name. --playlist-items 1: a link to a
    // playlist or channel reads its first video, not all of them. "--": the link is never read
    // as an option.
    [
      "--no-warnings",
      "--ignore-config",
      "--no-playlist",
      "--playlist-items",
      "1",
      "--dump-json",
      "--",
      url,
    ],
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

// Reels are small (the spike's were 3–11 MB): a bigger file isn't a short recipe video. Only
// checked when the platform says the size; otherwise the download's timeout bounds it.
const MAX_DOWNLOAD = "100M";

// ffprobe reads a local file: quick.
const FFPROBE_TIMEOUT_MS = 10_000;

// Downloads an Instagram or Facebook post's video into `dir` and reads its info in the same
// call (§4.1): one request to the platform, not two. The caller deletes the folder. The path
// is missing when there's no video to have: a photo post (--ignore-no-formats-error prints its
// info anyway), or one over the size limit (skipped, and still a success).
export async function downloadVideo(
  url: string,
  dir: string,
  signal: AbortSignal,
): Promise<VideoInfo & { path?: string }> {
  const { stdout } = await run(
    "yt-dlp",
    // As readVideoInfo, plus: --no-simulate downloads although the info is printed;
    // --ignore-config, so no config file changes where it goes or what; -P is the folder and
    // -o the name, kept apart so the folder's path is never read as a template;
    // --remux-video mp4 makes it an .mp4 without re-encoding.
    [
      "--no-warnings",
      "--ignore-config",
      "--no-playlist",
      "--playlist-items",
      "1",
      "--dump-json",
      "--no-simulate",
      "--ignore-no-formats-error",
      "--max-filesize",
      MAX_DOWNLOAD,
      "--remux-video",
      "mp4",
      "-P",
      dir,
      "-o",
      "video.%(ext)s",
      "--",
      url,
    ],
    { signal, timeout: DOWNLOAD_TIMEOUT_MS, maxBuffer: YTDLP_MAX_OUTPUT },
  );
  const path = join(dir, "video.mp4");
  return { ...parseVideoInfo(stdout), path: existsSync(path) ? path : undefined };
}

// The length of a downloaded video, with ffprobe: Instagram doesn't say it before (§4.1).
export async function measureSeconds(path: string, signal: AbortSignal): Promise<number> {
  const { stdout } = await run(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
    { signal, timeout: FFPROBE_TIMEOUT_MS },
  );
  const seconds = Number(stdout.trim());
  // Not "": Number("") is 0, which would pass any length check.
  if (!(seconds > 0)) throw new Error(`ffprobe gave no length: "${stdout.trim()}"`);
  return seconds;
}
