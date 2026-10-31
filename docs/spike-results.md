# M0 spike results

Run on 2026-10-31 with `spike/` (yt-dlp 2026.10.26, `gemini-3.5-flash`), no cookies.
The design changes these findings caused are in `docs/system-design.md` (§1, §4.1, §4.5, §9,
§11, D15, D16).

## What we ran

12 real links chosen by the user: 6 YouTube Shorts, 3 Instagram posts, 3 Facebook reels.
That is fewer than the plan in §4.5 (10 / 5 / 3 / 3), and **no stories**. Stories stay
unsupported from a link (§1), so the screenshot fallback is still their only way in.

The links were run three times:

1. **Video only:** Instagram failed, because it doesn't report a length.
2. **Video only, length measured after the download:** 12/12 gave a recipe.
3. **Video plus the post's caption:** 10/12 gave a recipe; one was correctly "not a recipe"
   and one failed with a Gemini network error.

## Final run (video + caption)

| # | Platform | Video s | Caption chars | Outcome | Title | Ingredients | Steps | Took s |
|---|---|---|---|---|---|---|---|---|
| 1 | YouTube | 144 | 1164 | recipe | One-Pot Chicken Thighs with Rice, Chickpeas, and Carrots | 13 | 11 | 13 |
| 2 | YouTube | 26 | 0 | recipe | Deep-Fried Mozzarella Block | 5 | 5 | 12 |
| 3 | YouTube | 179 | 1021 | recipe | One-Pot Chicken Thigh, Potato, and Rice Sofrito | 10 | 10 | 17 |
| 4 | YouTube | 146 | 899 | failed: `fetch failed` | — | | | 1649 |
| 5 | YouTube | 69 | 2104 | recipe | Chocolate Lotus Crunch Dream Cake | 19 | 12 | 17 |
| 6 | YouTube | 85 | 1899 | recipe | מילפיי תפוחים מקורמלים | 4 | 8 | 16 |
| 7 | Instagram | 13 | 270 | not a recipe | עוגת שוקולד דיאטתית במיקרו | 0 | 0 | 23 |
| 8 | Instagram | 35 | 762 | recipe | Deconstructed Stuffed Cabbage Bake | 13 | 6 | 34 |
| 9 | Instagram | 36 | 1025 | recipe | פרגיות וניוקי בסיר אחד | 13 | 6 | 33 |
| 10 | Facebook | 170 | 1065 | recipe | Chicken in Caramelized Onion Jam | 8 | 11 | 63 |
| 11 | Facebook | 28 | 311 | recipe | Thai Pomelo Salad with Plant-Based Fish Fingers | 11 | 5 | 26 |
| 12 | Facebook | 71 | 410 | recipe | לחם חמאת שקדים | 5 | 5 | 27 |

## Findings

1. **All three platforms download without cookies** (public posts). Instagram 3/3 and
   Facebook 3/3. We never needed `YTDLP_BROWSER`.
2. **Instagram doesn't report a video length** (`duration` is `NA`). The length can only be
   checked after the download, with `ffprobe`. The videos were small: 13–36 s and 3–11 MB.
3. **The caption often holds the real recipe.** Gemini only sees what it's sent, and in the
   first runs it never saw the caption. On the 10 links that were recipes in both runs,
   ingredients without a quantity went from **42 of 106** (video only) to **13 of 101**
   (video + caption).
   - The cake (#5) went from 17 missing to 0, and the almond bread (#12) from 9 to 1; their
     quantities are written in the caption, not said in the video.
   - #11 stayed at 10/11 missing: its caption is an advert with no recipe.
   - yt-dlp reads the caption for YouTube too, so every platform gets it the same way.
4. **The caption also helps spot non-recipes.** #7 is a product promo ("comment below to get
   the recipe"). From the video alone Gemini made up a three-ingredient recipe; with the
   caption it said "not a recipe".
5. **A Gemini call can hang.** #4 waited 27 minutes and then failed with `fetch failed`. It
   had worked in both earlier runs. A job must never outlive its 3-minute lease (§4.3), so
   every Gemini call needs its own timeout. After that, the normal retry handles it.
6. **Language is unstable.** The same Hebrew reel came back with an English title in one run
   and a Hebrew title in the next. **Decision (D16): the draft is written in the language of
   the post.** The prompt says so; tags stay English codes.
7. **Small output quirks for the Zod schema (M5):**
   - `unit` is often `""` instead of missing, so empty strings are turned into "not set".
   - `meal` sometimes has two values (lunch and dinner). That is fine: tags are an array.
8. **Time:** YouTube 12–17 s, Instagram 23–34 s, Facebook 26–63 s (when Gemini doesn't hang).
   Most of it is Gemini, plus the upload for Instagram and Facebook. This is inside the
   typical < 60 s target except for the longest Facebook reel.
9. **Run-to-run variance** is noticeable: titles, step counts and tags change between runs of
   the same link. That is what the draft review (D1) is for.
10. **Nutrition** came back for every recipe. When a caption states it (#12: 80 kcal per
    slice), Gemini used it.

## Not tested

Stories, private posts, carousels with several videos, videos over 3 minutes, and a
non-recipe video that has no caption. The worker's error paths cover them (length check,
`--playlist-items 1`, "not a recipe"); we will see them for real in M6.
