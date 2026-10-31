# M0 spike

A throwaway script, not app code (design §4.5, §12 M0): can `yt-dlp` and Gemini turn real
links into recipes?

1. Put links in `links.txt`, one per line.
2. Make sure `GEMINI_API_KEY` is set in the root `.env`.
3. `npm install && npm start` (from this folder).
   If Instagram asks for a login, rerun with `YTDLP_BROWSER=chrome npm start` to reuse
   Chrome's cookies.

Gemini gets each post's caption along with the video. The script writes `out/results.md`
(one row per link) and `out/<n>-<platform>.json` (what Gemini returned). `out/` is
git-ignored; the findings are in `docs/spike-results.md`.
