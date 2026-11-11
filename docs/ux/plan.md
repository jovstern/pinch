# Pinch — UX plan

The living plan: who Pinch is for, what matters most to them, the principles, the look, the
experience, and the numbered proposals. Written by the `designer` agent
(`.claude/agents/designer.md`) with the method in `.claude/skills/ux-strategy/SKILL.md`;
revised every milestone (`m<NN>.md` holds each pass). Evidence lives in `research.md`
(cited as A1…, B1…, C1…) and in the screenshots of `m05.md`. **Nothing here is approved until
the user says so**. Approved on 2026-11-09: **U4** and **U2**; the rest are `proposed`, to be
built after M6 with the answers in §9.

Last revised: 2026-11-09, pass 02 (`pass-02.md`): §2 personas, §4 analogues, §6 tokens, §8
U13–U16 proposed and U1/U5 replaced. Before that, the same day: the user's approvals and
answers (§8, §9).

## 1. Audience

People who meet recipes in their feed and cook at home, mostly 18–35 and skewing female
(A2, A3, A5); newer to cooking than their parents (A2) and not loyal to creators — over 70%
find food through the algorithm, 44% follow nobody in particular (A4). They save as a
reflex while scrolling, on a phone, off-hours; cooking is a separate moment, weekly meal
planning for half of them (A4), roughly monthly for any one saved video (A19), at the stove
with a phone, with delivery one tap away (A8). Between the two sits shopping: two thirds have
bought an ingredient because a recipe showed it (A6).

What they have today is a graveyard: an Instagram Saved folder with no sort or search (A21),
a TikTok liked tab, a Notes list of links (A8), "200 tabs on your phone" (A9), and the
honest confession "99% of the recipes I have saved on social media I've never cooked or even
looked at again" (A10). The pain is not saving — saving is free — it is **finding it again**
and **cooking from a video**: "the next step would pass too quickly… I would have to stop
what I was doing, wash off my hands, and rewind" (A17). And they half-trust the machine: 62%
trust a recipe from social media, 40% trust one written by generative AI (A5).

Platform split: the youngest arrive from TikTok and Instagram (women especially), the
30-somethings and men from YouTube (A1, A3, A5). Pinch covers Instagram, Facebook and
YouTube; **TikTok, the largest Gen Z source, is the gap** (a question for the user, §9).

`[ASSUMPTION]` Pinch's first real users are the developer's own household and friends in
Israel: bilingual, Hebrew recipes common (the seed has one, the spike had four of twelve), a
kosher facet already in the tags. Nothing in the research covers this group; it is read off
the repo.

## 2. Personas

Two, not three: the evidence splits cleanly on capture-and-cook versus trust-and-find, and a
third would be a demographic, not a person.

### Noa — primary

29, Tel Aviv, works in product marketing, lives with her partner. Scrolls Instagram in bed
and on the bus; has 200-odd saved reels and cooks the same four dishes. Reads Hebrew and
English, saves recipes in both. Phone only — a laptop is for work. Cooks on weeknights at
19:00 with the fridge open and Wolt on the other screen.

- **Goal:** turn the one reel that made her hungry into dinner this week, without thinking
  about it when she saves it.
- **Frustration today:** "I save it, and then it's gone — I can't search my saved reels, and
  when I do find one I stand there with wet hands rewinding a 30-second video for the third
  time."
- **Done feels like:** she opens Pinch at 18:40, taps "quick" and "vegetarian", picks the
  shakshuka she pinched on Sunday, props the phone against the kettle, and the screen is
  still on at step 4.
- **Why primary:** she is the median of the research (A2, A3, A5, A8, A17, A21) and the
  reason Pinch exists: a reel → a recipe → a dinner.
- **Device split (pass 02):** phone ~100%: in bed and on the bus to pinch, at the counter to
  cook.
- **She remembers by the picture (pass 02):** "the one with the eggs in the red pan", not its
  name (D4 Tasty: hard to find "without remembering its name"; E4 NN/g). A card with no
  picture is a recipe she won't find.
- **Moment of truth:** Paste → the reel's picture appears in the queue before she has put the
  phone down.
- **Accessibility stretch:** wet hands and the phone propped at arm's length: targets a
  knuckle can hit, type readable from 60 cm.

### Daniel — secondary

41, Modi'in, two children, cooks most of Friday for the weekend. Finds recipes on YouTube
(A1, A3), cares that quantities are right and that nothing is invented — he has been burned
by "a splash" and a draft that turned "6–8 tbsp" into "6 tablespoons" (A15). Props an iPad on
the counter; searches by what is in the fridge.

- **Goal:** a recipe he can trust and find again a month later by ingredient.
- **Frustration today:** "The video says 'a cup' and the caption says '200 g' — which did
  the app take? I'd rather check for thirty seconds now than cook it wrong."
- **Done feels like:** the draft shows him what came from the caption and what the model
  guessed, he fixes one quantity, saves, and in March "chickpeas" finds it.
- **Why secondary:** he sets the bar for review and search; if the draft earns his trust it
  earns anyone's (A5: 40% trust AI recipes).
- **Device split (pass 02):** `[ASSUMPTION]` a laptop on Thursday night to pinch three or four
  links and check them against the posts; the iPad on the counter on Friday.
- **Moment of truth:** a draft with the post beside it and a yellow mark on the one quantity
  the model doubted (E3 Dext: "anything… unsure of comes to you first").
- **Accessibility stretch:** Hebrew and English recipes mixed in one list, and reading
  glasses left in the other room: each block in its own direction, quantities in tabular
  figures, nothing below 16 px on the recipe.

## 3. What matters most

### Noa's jobs, ranked

| # | Job | Moment of truth |
|---|---|---|
| N1 | **Pinch the reel the moment she sees it** | In bed, reel found, the recipe is saved before the next reel plays. Two taps, no decision. |
| N2 | **Pick something to cook tonight** | 18:40, fridge open: "quick, vegetarian, what have I got?" — one screen, a few taps, a choice she likes. |
| N3 | **Cook from it at the stove** | Wet hands, onions in the pan, "what was step 4?" — the screen is on, step 4 is big, and the video is one tap away if the step is unclear. |

### Daniel's jobs, ranked

| # | Job | Moment of truth |
|---|---|---|
| D1 | **Trust the draft before it's saved** | Spotting that "1 cup" came from the video and "200 g" from the caption, and choosing in one tap. |
| D2 | **Find it again by ingredient, weeks later** | "chickpeas" on a Friday morning finds the one from February. |
| D3 | **Cook for the family from a propped tablet** | Ingredients beside steps on a landscape screen, nothing to scroll. |

### Journeys through Pinch today (where it breaks → `m05.md`)

**N1, pinch a reel (today).** 1. Copy the link in Instagram (Share → Copy link). 2. Switch
to the browser, find Pinch (it isn't on the home screen: no manifest, not installable).
3. Scroll past the heading to the box (fine). 4. Tap the box, long-press, Paste. 5. Find
"Pinch it" under a two-line hint and tap it. 6. The box empties; a dashed row appears below
with the raw URL and "Waiting to start…"; nothing says *saved*. **Breaks:** six steps where
two are possible; no share sheet (B1–B3, B14 all have one); no "Paste" button (C17); no
confirmation (C2, C5); the capture is a form, not a reflex.

**N2, pick dinner (today).** 1. Open `/`. 2. Scroll ~1,000 px past the box, hint, button
and imports to the first card (m05 §1). 3. Eleven identical white bars, no picture, no
cuisine, nothing new/cooked (m05 §3). 4. Open "Filter by tags": 35 chips in five groups push
the list another 1,700 px down (m05 §5). 5. Tick "quick"; the result lands 1,850 px from the
top. **Breaks:** the library is the last thing on the page named "Your recipes"; nothing to
browse by mood; the filter is a form, not a few chips (C14, B5).

**N3, cook (today).** 1. Open the recipe. 2. Read the 16 px ingredients, scroll ~1,100 px to
Steps (long recipe at 360). 3. Edit and Delete sit above the ingredients where a thumb lands
(m05 §7). 4. The screen locks after a minute; unlock with a wet knuckle; find the step again.
5. The step is unclear; there is no link to the reel (m05 §8). **Breaks:** no cook mode, no
wake lock (C10), no step focus (B4, B5, B6, B10), no way back to the video (the gap in B).

**D1, trust the draft (today).** 1. "Ready to review" → the New-recipe form with the draft
in it (m05 §11). 2. Nothing shows the caption or the video; the source is a raw link at the
top. 3. Nothing marks an empty Prep or a missing quantity; nutrition isn't shown. 4. Save is
2,500 px down, past all 35 tag chips, with Discard floating alone (m05 §12). **Breaks:** review
is typing, not checking (B5 preview-then-save; C18, C19 confidence marks; C7 naming what's
missing); the decision is at the bottom (B3's review asked for a sticky Save).

**D2, find by ingredient (today).** Works: the text index covers ingredient names (§7), the
search box is above the list, the URL keeps the query. **Breaks:** the box is mid-page under
the imports; a no-match message is below the fold (m05 §5).

**D3, tablet (today).** One 720 px column at 1440 px; ingredients and steps queue vertically
with half the screen empty (m05 §7). **Breaks:** no two-column cook layout (B4, B6 landscape).

## 4. Analogues worth borrowing

| Pattern | From | Why it fits | In Pinch |
|---|---|---|---|
| **Optimistic card, fills in the background** | Deglaze (B14); Instapaper's banner (C2) | N1: saving must feel done before the worker starts | On Pinch it, a card appears at once in the library's "Making" strip with the platform mark and the link's title-to-be; the body fills when the draft lands |
| **"Pinched. Undo" toast** | Gmail Undo Send (C5) | N1: confirmation without a modal, a cheap way out | A Radix Toast, 5 s, "Undo" deletes the import |
| **Items-left strip + per-item state, failure named** | Google Photos (C6), Expensify (C7) | N1/D1: a 15–60 s job with no honest percentage; "stuck loading" is the category's worst screen (A14, A16, B) | "Making 2 recipes…" / "1 ready to check" in a compact strip; a failed row says what wasn't found and keeps the link (Pestle's bookmark, B8) |
| **Preview-then-save; yellow = check this, red = missing** | Mela (B5), Triton transcripts (C18), Grammarly (C19), CookBook (B12) | D1: 40% trust AI recipes (A5); review is checking, not typing | The review page is the recipe page itself with marks on uncertain fields; tap a field to edit it in place; the caption folded underneath; a sticky Save |
| **Cook mode: one big step, inline ingredients, timers from text, screen awake** | Crouton (B4), Mela, Paprika (B6), Cooked (B10, on the web), Wake Lock API (C10) | N3/D3: the stove moment | `/recipes/:id/cook`: 22–24 px type, the current step with its ingredients and quantities inline, a "12 min" chip that starts a timer, Wake Lock, landscape two columns |
| **A way back to the video** | Nobody does it (B synthesis); Digital Trends' rewind loop (A17) | N3: when a step is unclear | A persistent "Open the reel" button in cook mode (we store the URL, §6); per-step timestamps later |
| **Exclusive status + free tags; "want to cook" shelf** | Goodreads (C12), Letterboxd (C13), Mela (B5), CookBook's last-cooked (B12) | N2: a small library browsed by intent, not facets | `toCook` / `cooked` with dates; "Want to cook" and "Cooked" as sections; mood tags stay as they are |
| **A few mood chips, full filters behind a button** | Spotify's five genre options (C14) | N2: 35 chips kill the list on a phone | 4–5 chips from the cook's own tags ("quick", "vegetarian", "dinner"…) in one scrolling row; a Radix Dialog sheet holds the rest |
| **One place, no decisions at capture** | Raindrop's Unsorted (C1), Stasht (A21) | N1: "any system that depends on you doing manual work at save time will decay" | No category, no tag, no name at pinch time; everything happens in review |
| **Two tabs: add vs mine** (pass 02) | Tasty's Discover / My Recipes (D4), Shazam's Home / Library (E1) | The user asked for a clear split; the form buried the library | Recipes and Pinch tabs (U13) |
| **An inbox of things to process, with states** (pass 02) | Things' Inbox (E2), Dext's In Processing / To Review (E3) | N1/D1: drafts are work, not recipes | The queue on the Pinch tab: making / ready to check (names what's missing) / failed |
| **A literal cover when there's no picture** (pass 02) | NN/g picture superiority (E4), dev.to's generated cover | N2: recall by picture | The dish's emoji on a cuisine tint (U14) |
| **The source beside the extracted fields** (pass 02) | Dext's image-left, fields-right (E3) | D1: checking is a glance across | Check page: post + caption left on desktop |
| **Share target + Paste button** | Web Share Target (C15), Clipboard API (C17), Umami's paste entry (B9) | N1: Android gets the share sheet after install; iOS has none (WebKit 194593) | `share_target` in the manifest → `/add?url=`; a "Paste" button that calls `readText()` on tap |

## 5. Principles

1. **Two taps, no questions.** Pinching never asks for a category, a name or a tag; it never
   opens a modal; it is confirmed by a toast and a card, not a page. *Rules out:* the current
   four-line textarea with a hint as the home's hero, and any "choose a cookbook" step.
2. **Adding is the home; the library is one tap away.** The first tab (New recipe) and the
   first screen are the input and the queue under it (the user's sketch, pass 02 revision 1: "pinch it or
   add a recipe is the main event of the app, so it always be first"). My recipes is its own
   tab. *Rules out:* recipes and the queue on one page; a filter panel in the page flow.
3. **One hand, wet.** Anything used at the stove is big, one thing at a time, keeps the
   screen on, and can be reached with a knuckle. *Rules out:* Edit and Delete above the
   ingredients; 16 px steps; relying on scroll to find the current step.
4. **Show your work.** The draft says where each thing came from and what the model wasn't
   sure of; a failure says what wasn't found and keeps the link. *Rules out:* a silent
   normalisation of a quantity; a spinner without a reason; a review page that looks like a
   blank form.
5. **Looks like food, reads like a cook.** Warm, picture-first, one confident accent, short
   plain sentences in the cook's words, in the recipe's own language and direction. *Rules
   out:* grey bordered boxes as the default element; English headings on a Hebrew recipe;
   light-only.

## 6. The look

**Direction: a cook's notebook under a kitchen lamp.** Warm paper, ink, one paprika accent
used with confidence (as Mela uses its yellow, B5), a serif display face for titles and the
wordmark, photos in the reel's own portrait shape, and a true dark theme for the hour reels
are saved. Not a SaaS form; not a glossy food magazine either.

Checked against `frontend-design`'s generic defaults: no Inter-plus-purple, no gradient hero,
no uniform bordered cards, no shadow-on-everything; depth comes from surface steps and type,
not from borders. The one risk is "warm beige recipe app" as a cliché — the serif display,
the portrait tiles and the dark theme are what keep it from reading as a template.

### Tokens (for `client/src/globals.css` `@theme`; the existing names stay, new ones added)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-surface` | `#FBF8F2` | `#17130F` | page |
| `--color-surface-raised` | `#FFFFFF` | `#221C16` | cards, inputs, sheets |
| `--color-surface-sunken` | `#F3EDE2` | `#0F0C09` | the capture bar's well |
| `--color-fill` | `#EFE7DA` | `#2C241D` | chips and secondary buttons at rest, placeholders (added in U4 PR 2: sunken is invisible on the dark page) |
| `--color-border` | `#E6DED1` | `#3A3029` | 1 px lines, used sparingly |
| `--color-text` | `#221A12` | `#F3EDE4` | ink |
| `--color-text-muted` | `#6E6257` | `#A89C8F` | meta, notes (≥ 4.5:1 on its surface) |
| `--color-accent` | `#C8471B` | `#F0693A` | paprika: the one primary action per screen, the wordmark, selected state |
| `--color-accent-strong` | `#A33612` | `#F0693A` | accent where it must pass AA at body size (links, the fill under `on-accent` labels) |
| `--color-accent-soft` | `#FBE7DF` | `#3A1D12` | selected chip fill, "ready" row tint |
| `--color-check` | `#E8B931` | `#F2C94C` | "check this" marks in review (yellow, never alone: an icon and text go with it) |
| `--color-cooked` | `#5E7A3A` | `#8FB35E` | "cooked" and success (olive), never alone |
| `--color-danger` | `#B3261E` | `#F2706A` | delete, failed |
| `--color-check-soft` | `#FBF1D3` | `#3A2F12` | background of a field to check (pass 02, proposed) |
| `--color-check-mark` | `#8A6A00` | `#F2C94C` | the ◆ glyph of a check mark (pass 02, proposed: `check` is too light as a glyph on paper) |
| `--color-danger-soft` | `#FBE4E1` | `#3D1715` | background of a missing required field (pass 02, proposed) |
| `--color-tile-tomato` | `#F8E1D8` | `#4A2419` | no-picture cover: Italian, Mexican (pass 02, proposed, U14) |
| `--color-tile-saffron` | `#F5E3B8` | `#3E2F16` | cover: Middle Eastern, Indian |
| `--color-tile-olive` | `#DDE5C8` | `#29331A` | cover: Mediterranean, other |
| `--color-tile-sea` | `#DCE9E9` | `#1E3436` | cover: Asian |
| `--color-tile-plum` | `#EEE2EA` | `#3B2434` | cover: French, American, desserts |

Pass 02 checked every pair of these with the contrast script (table in `pass-02.md` §6): all
AA, ink and muted text on every tile.

Contrast must be re-checked in the token PR with a checker for every pair in both themes
(`ui-craft`: AA everywhere); the values above were chosen to pass and the muted/paper pair
is the tight one. Checked in U4 PR 1: all pass. Two tokens were added there: `--color-on-accent`
(white in light, `#17130F` in dark, since white on the dark accent fails AA) for labels on
accent and danger buttons, and `--color-scrim` (`#0F0C09`) behind dialogs.
`:root { color-scheme: light dark }`, dark under
`@media (prefers-color-scheme: dark)` only — no toggle in v1 (smart defaults over settings).

**Type.** Display: **Fraunces** (variable serif, SIL OFL), self-hosted woff2 subset to
Latin, `wght` 500–700. Built (U4 PR 1): 29.5 kB, with the optical size
fixed at 36 (with the `opsz` axis it was 55 kB); for `h1`, `h2`, the
wordmark and the cook-mode step. Hebrew titles fall back to the system serif via the stack
(`"Fraunces", "Frank Ruhl Libre", Georgia, serif` — Frank Ruhl Libre only if a Hebrew subset
is wanted later; not in the first PR). Body: the system sans as today (zero bytes). Scale
1.25 from 16 px: 16 / 20 / 25 / 31 / 39; cook mode body 22 px, step 25–31 px; `text-wrap:
balance` on headings, `pretty` on paragraphs; tabular numbers on quantities. Budget: the
display font is the one new download and must fit the 165 kB SPA budget with the entry
(`docs/metrics/m04.md`); if it doesn't, ship it only on the recipe and cook routes.
Built (M7): no longer fetched with the page (that cost the data pages' LCP 300–450 ms,
`docs/metrics/m06.md` Miss 1): `client/src/lib/displayFont.ts` adds it 1.5 s after the page
has loaded, and until then a Georgia sized to match ("Fraunces Fallback") holds its place; it never
blocks text, so `font-display` no longer applies.

**Shape.** Cards 16 px radius, controls 12 px, chips full; one soft shadow token for sheets
and the toast only; borders only where two raised surfaces meet. Built (U4 PR 2): fields keep a
border, `--color-border-field`, at 3:1 against the page (WCAG 1.4.11: an empty field must be
seen); secondary buttons and chips at rest are `fill`, not boxes; the recipe cards keep
their line until U5 gives them a face; imports stay dashed (a filled row would hide its
filled button); the dialog keeps a line (it would vanish over the dark scrim) and the header
its rule.

**Imagery.** Thumbnails (M6, §5) shown **4:5 portrait**, the reel's own shape, on cards; at
the top of a recipe on a phone, full width at 5:4 (pass 02: a 4:5 picture would fill the
first screen and push Cook down). A recipe with no picture gets a cover (U14, pass 02): the
dish's emoji (from the model; else the cuisine's) at 64 px on a cuisine tint
(`--color-tile-*`). The platform's
mark (a small monochrome glyph, 16 px) sits on the card's corner. No stock photos, no hero
illustration.

**Motion.** 180 ms ease-out for enter/expand; the "Making…" row shimmers; a card's thumbnail
→ recipe header uses the View Transition API where supported; all off under
`prefers-reduced-motion`.

**Mark.** The user's own (2026-11-11): a "Pinch" script wordmark in `#A33612`
(`--color-accent-strong`) and its "P" as the favicon; they replace the pinched-fingers glyph
of U4. In the header (design §14, D24): the wordmark from 768 px, the P mark on a phone, each
in `#F0693A` (the dark `--color-accent`) in the dark theme. The 192/512 PNG icons come with the
manifest in U8 (PWA, later).

## 7. The experience

### Information architecture

| Address | Screen | Job |
|---|---|---|
| `/` | **New recipe** tab, the default (pass 02 rev 2): one input for a link or text that grows when needed, Paste, **Pinch it**, and the queue under it ("Cooking… · N ready"; Review / Retry / Dismiss) | N1, D1 |
| `/recipes` | **My recipes** tab: search, Filters (time, source, the five tag facets), tag chips, a grid of portrait cards; "Want to cook" / "Cooked" sections when U9 lands | N2, D2 |
| `/recipes?q=…&tags=…` | Library, searching / filtered (one flat grid, the count at the top) | N2, D2 |
| `/recipes/:id` | **Recipe** (thumbnail, title, meta, tags, **Cook** as the one primary action, "Open the reel", ingredients, steps; Edit and more under a `…` menu) | N3, D2 |
| `/recipes/:id/cook` | **Cook mode** (new) | N3, D3 |
| `/imports/:id` | **Check the recipe** (the review, as a recipe preview with marks; tap to edit) | D1 |
| `/recipes/new`, `/recipes/:id/edit` | The form, shortened | manual entry, fixes |
| `/add?url=…&text=…` | Share-target landing (new): creates the import and goes to `/` (Add a recipe) with the toast | N1 (Android PWA) |
| `*` | Page not found | — |

Pass 02 (U13, revision 1 from the user's sketch): two tabs, **New recipe** (first, the
default) and **My recipes**, as shadcn Tabs (revision 2: no logo for now; the user's logo came on 2026-11-11, design §14). Phone: the tabs and the
avatar are the header, and **Write a recipe** floats bottom right on both tabs. Desktop: the
tabs on the left, Write a recipe and the avatar on the right. Every inner page has breadcrumbs
under the header. Every async change to a recipe's status confirms itself in a toast. (Replaces "no bottom tab bar yet": the user asked for a clear split between
capture and the library.) Desktop and
tablet: the library grid goes to 3–4 columns; the recipe and cook mode go two-column
(ingredients left, steps right) above 768 px.

### Key flows

- **Pinch:** paste into the bar (or tap Paste, or share from Instagram on Android) → the bar
  validates inline (a non-link with no spaces: "That's not a link we know — Instagram,
  Facebook or YouTube") → Pinch → toast "Pinched. Making your recipe… Undo" → a shimmering
  card in the queue strip ("Instagram · Reading the caption…" / "Watching the video…") →
  "Ready to check" with the title the model found → tap → Check.
- **Check:** the draft as a recipe page; fields the model marked uncertain carry a yellow
  "check" mark with the reason ("no quantity in the caption or video"); required-and-missing
  in red; the caption folded under "What the post said"; the reel link at the top. Tap any
  field to edit it in place (the same TanStack Form, one field at a time in a popover/sheet).
  A sticky bar: **Save** / Later / Discard (Discard in the `…`). Save → the recipe, toast
  "Saved to your recipes".
- **Pick:** mood chips (the cook's five most-used tags, "quick" always first) filter the grid
  in place; search runs on Enter; sections collapse into one grid while filtering.
- **Cook:** Recipe → Cook → full-screen: step N of M, the step in 25–31 px with its
  ingredients inline (tap to tick), a "20 min" chip that starts a timer shown in a bottom
  bar, Next / Back as 56 px targets at the bottom and by swipe, Wake Lock on with a quiet
  "Screen stays on" (and "Couldn't keep the screen on" when refused), "Open the reel" and
  "Ingredients" as the two secondary actions, Exit top-left. Leaving asks nothing; it
  remembers the step for an hour.
- **Cooked:** at the last step, "I made this" (one tap) → status `cooked` with today's date,
  back to the recipe; optional note.

### States

| | Loading | Empty | Error | Partial / other |
|---|---|---|---|---|
| Library | card-shaped placeholders in the grid, the bar drawn first (no CLS, metrics m04) | a tinted tile with a one-line example of what a pinched recipe becomes, the bar focused, "or write one" | "We couldn't load your recipes." Try again | filtered: "3 match" at the top; none: "Nothing matches — clear"; offline (PWA): the last list from the cache, the bar says "You're offline — we'll pinch it when you're back" |
| Queue (Pinch tab) | shimmer per row, a stage word | three "how it works" steps | a failed row: what wasn't found, Retry · Keep the link · Dismiss | stalled: "Nothing is working on this" (§4.3) |
| Check | the recipe skeleton | — | as the recipe | partial draft: "We found the ingredients but no steps" with the red mark on Steps |
| Recipe | skeleton with the 4:5 tile | — | Try again; not found → back to the library | no thumbnail → tinted tile |
| Cook mode | — | — | wake lock refused → the quiet note | reduced motion: no swipe animation |

### Microcopy voice

Short, plain, second person, the cook's words. Verbs over nouns: "Pinch it", "Check it",
"Cook", "I made this". Say what happened and the next thing: "We couldn't find a recipe in
this reel. Keep the link, or paste the caption." Never "import", "process", "extract" to the
user; "pinch", "making", "ready to check". Numbers as the recipe says them ("3 1/2 cups"),
never rounded silently. The recipe's own language and direction on the recipe and cook
screens (`dir="auto"` per block; section headings follow the recipe's language later).

### Accessibility floor (`ui-craft`)

Everything already true stays: one `h1`, landmarks, 44 px targets, visible focus, live
regions for the queue (one change at a time), Radix for dialog/toast/popover/sheet, zero axe
violations in both themes. New: cook mode's Next/Back are real buttons (swipe is extra); the
timer announces at zero; the yellow/red marks always carry an icon and text; the Wake Lock
state is text, not a dot; the mood chips are checkboxes as today's TagPicker.

### Surface closure

| Job | Screen | Served? |
|---|---|---|
| N1 pinch | Pinch tab, `/add`, toast, queue | yes after U13, U15, U6, U8 |
| N2 pick | Recipes tab, chips, cards with a face | yes after U13, U14, U7, U9 |
| N3 cook | Cook mode, "Open the reel" | yes after U2, U10 |
| D1 trust | Check | yes after U3 |
| D2 find | Recipes search | yes today; better after U13 |
| D3 tablet | Cook mode two-column | yes after U2 |
| — | `/recipes/new` | serves no persona job directly (manual entry is the fallback the design asks for, §1.7); kept, demoted to the `…` menu |

## 8. Proposals

Ranked by impact over effort. Effort in PRs of ≤ ~300 lines. Impact is on the primary
persona unless named. **Status:** `proposed` for all; only the user moves one.

### U1 — The library is the home; capture is a bar — `flow` + `look` — **high** — 2 PRs — `replaced by U13 (pass 02)`

- **Problem:** Noa's N2 journey: the first recipe is ~1,000 px down at 360 px; `/` is a form
  with a list under it (`m05.md` §1–3, `home-imports-360-full.png`). The spec names the
  screen "Your recipes" and "pick something to cook" as its job (§14).
- **Change:** a one-line **capture bar** at the top (`<input>`, not a textarea, with a
  **Paste** button and **Pinch**; it grows into a textarea only when the paste has a space or
  newline — the M5 rule, kept), the hint as its placeholder; the queue strip (U6) under it;
  then the chips row (U7) and the grid. Filters and search move into one row. The heading
  "Your recipes" goes (the mark is the title); "New recipe" moves to a `…` menu. Desktop: a
  3–4 column grid. The empty state shows one example tile.
- **Touches:** `RecipeListPage.tsx`, `ImportForm.tsx` (becomes `CaptureBar.tsx`),
  `Layout.tsx`, `ListFilters.tsx`; design §14 (`/`'s description). No server change.
- **Depends on:** U4 tokens first (one PR), else it is restyled twice.

### U2 — Cook mode — `feature` — **high** — 3 PRs — `approved` (2026-11-09)

- **Problem:** N3 and D3: the recipe is a 16 px document; the screen locks; Edit/Delete sit
  where the thumb lands; no two-column layout at any width (`m05.md` §7,
  `recipe-long-360-full.png`, `recipe-long-1440.png`). Every competitor's cook mode has one
  highlighted step, larger type, wake lock, timers, check-off (B4–B7, B10, B12); the Wake
  Lock API is Baseline 2025 including iOS Safari (C10).
- **Change:** `/recipes/:id/cook`: step N of M in display type, the step's ingredients inline
  (matched by name, tickable), a timer chip for each duration found in the text ("20 min",
  "6–7 minutes"), Next/Back buttons + swipe, Wake Lock with a visible state, "Open the reel"
  (U10) and an Ingredients sheet, Exit; landscape/≥ 768 px two columns. On the recipe page:
  **Cook** becomes the one primary button under the title; Edit/Delete move into a `…`
  menu (Radix DropdownMenu, ≈ 10 kB — check against the budget). PR 1: the route, type,
  steps, Wake Lock. PR 2: inline ingredients and tick-off. PR 3: timers (+ "I made this" if
  U9 is approved).
- **Touches:** new `features/cook/` (`CookPage.tsx`, `useWakeLock.ts`, `durations.ts` pure
  + tests), `RecipePage.tsx`, `App.tsx`; design §14 (new screen), §1 (cook mode is a new
  functional requirement). No server change; no stored media.

### U3 — Check, don't retype: review as a marked-up preview — `flow` + `feature` — **high** (Daniel: very high) — 3 PRs — `proposed`

- **Problem:** D1: review is the New-recipe form (`review-360-full.png`, 2,610 px for three
  ingredients; a real draft will be 5,000+). Nothing shows the caption or marks what the model
  was unsure of; nutrition is hidden; Save is at the bottom (`m05.md` §11–12). 40% trust AI
  recipes (A5); Mela's preview-then-save is the pattern users praise (B5); yellow for
  "check", red for "missing" (C18, C19); name what wasn't found (C7).
- **Change:** `/imports/:id` renders the draft **as the recipe page** (U2's layout) with
  a sticky Save / Later bar; tap a field (title, a quantity, a step) to edit it in a small
  sheet; a folded "What the post said" shows the caption; marks: yellow on fields the model
  flagged uncertain or that are empty-but-usual (Prep, a quantity), red on required-and-empty
  (title, no ingredients, no steps), each with one line of reason. Nutrition shown as it will
  be on the recipe. Discard under `…`.
- **Touches:** `ReviewImportPage.tsx` (rewritten), new `FieldSheet.tsx`, `RecipeView.tsx`
  shared with `RecipePage`; **server and `shared/`:** the worker keeps the caption it already
  reads (text, ≤ 10,000 chars, on the import as `input.caption` or `draft.sourceText`) and the
  Gemini schema gains `uncertain: string[]` (field paths), both Zod; design §4.1, §6, §9.
  PR 1: preview layout + sticky bar (client only). PR 2: caption + uncertain fields (server,
  shared, prompt). PR 3: marks and reasons in the UI.

### U4 — The look: tokens, type, mark, dark mode — `look` — **high** — 2 PRs — `approved` (2026-11-09)

- **Problem:** the app reads as a Tailwind starter: every element a bordered rectangle,
  light-only, system sans everywhere, an orange word for a mark (`m05.md` §15).
- **Change:** §6 as written: the token table in `@theme` (light + dark), `color-scheme:
  light dark`, Fraunces for display, the radii and the one shadow, the Button/TextField/
  chip restyled on tokens, the mark and PWA icon. PR 1: tokens, dark theme, type (no layout
  change: every screen looks better and nothing moves). PR 2: the components and the mark.
- **Touches:** `globals.css`, `Button.tsx`, `TextField.tsx`, `TagPicker.tsx`, `Layout.tsx`,
  `index.html` (`theme-color`, icons), `public/`. Bundle: the font subset ≈ 35–45 kB against
  the 165 kB budget — the observer measures it in PR 1; the fallback is loading it only on
  the recipe and cook routes.

### U5 — Cards with a face — `component` — **medium** (high after M6) — 1 PR — `absorbed by U14 (pass 02)`

- **Problem:** eleven identical bars (`m05.md` §3). Nothing to browse by.
- **Change:** a portrait card (4:5 tile; the thumbnail when M6 lands, else the cuisine tile
  with its emoji; the platform glyph in a corner; title in display type; "30 min · 6
  ingredients"; a small "New" or "Cooked ✓" mark when U9 exists). Two columns at 360, four
  at 1440.
- **Touches:** new `RecipeCard.tsx`, `RecipeListPage.tsx`; `GET /api/recipes` already omits
  the thumbnail and serves it by URL (§5). Design §14 (the card's contents).

### U6 — The queue as a status strip with Undo — `component` — **medium** — 1 PR — `proposed`

- **Problem:** dashed boxes with raw tracking URLs; "Ready to review" weaker than a card;
  no confirmation on pinch (`m05.md` §4). "Stuck loading" is the category's worst screen
  (A14, A16); Google Photos' items-left + per-item state and Gmail's Undo are the models
  (C5, C6).
- **Change:** on Pinch it: toast "Pinched. Making your recipe… Undo" (Radix Toast; Undo =
  `DELETE /api/imports/:id`). The strip: one compact row per import — platform glyph, the
  host and title-to-be (never the query string), the stage ("Reading the caption…",
  "Watching the video…"), shimmer; a ready row is tinted `accent-soft` with **Check it** as
  the row's action; a failed row says what wasn't found and offers Retry · Dismiss. A header
  line "Making 2 · 1 ready to check".
- **Touches:** `ImportList.tsx`, `ImportActions.tsx`, new `PinchToast.tsx`; the worker's
  `step` already distinguishes fetching/analyzing (§4.2). No server change.

### U7 — Mood chips in one row; the full filter in a sheet — `component` — **medium** — 1 PR — `proposed`

- **Problem:** 35 chips in the page flow push the list 1,700 px down; a result lands 1,850 px
  from the top (`m05.md` §5, `home-filters-open-360-full.png`). Spotify's five chips (C14).
- **Change:** one horizontally scrolling row of 5–6 chips: "quick" first, then the cook's
  most-used tags (counted client-side from the loaded recipes, `[ASSUMPTION]` enough at ≤ 50
  per page), then "All filters" opening a Radix Dialog sheet with the full TagPicker and the
  search box. Applied tags show as removable chips in the row. The URL contract stays.
- **Touches:** `ListFilters.tsx`, `TagPicker.tsx` (reused), new `FilterSheet.tsx`. No server
  change.

### U8 — A PWA: installable, share target, Paste — `feature` — **high** for N1 — 2 PRs — `proposed`

- **Problem:** N1 is six steps; the app isn't on the home screen; no share sheet (every
  competitor's first path, B synthesis). Android Chrome supports `share_target` for an
  installed PWA; iOS does not (C15), so iOS gets a Paste button (C17) and an optional
  Shortcut. Design §1 lists the share target under "Later" and D7 chose paste for v1.
- **Change:** PR 1: `manifest.webmanifest` (name, 192/512 icons drawn from U4's mark, `start_url`,
  `display: standalone`, `theme_color`), served by the client build; an install hint after
  the first saved recipe (not on first load, per C16); the **Paste** button in the capture
  bar (`navigator.clipboard.readText()` on tap, with the plain input as the fallback). PR 2:
  `share_target` (GET, `params: { url, text, title }`) → `/add` reads all three, takes the
  first `http(s)` it finds (Android puts the URL in `text`), posts the import, and redirects
  to `/` with the toast. A service worker only for the offline shell, if at all, later.
- **Touches:** `client/public/manifest.webmanifest`, `index.html`, new `AddPage.tsx`,
  `CaptureBar.tsx`; design §1 (moves the share target from "Later"), D7 (amended). The API
  is unchanged; the server must serve the manifest with the right MIME type if it serves the
  client in production.

### U9 — Want to cook / Cooked — `feature` — **medium** — 2 PRs — `proposed`

- **Problem:** N2: a library with no "new" and no "done" is a pile (A10: "never cooked or
  even looked at again"); Goodreads/Letterboxd/Mela all have the exclusive status (C12, C13,
  B5); 31% re-make recipes (A4).
- **Change:** `status: "toCook" | "cooked"` (default `toCook` on save) and `cookedAt: Date[]`
  on the recipe; "I made this" at the end of cook mode and on the recipe; the library's
  sections "Want to cook" / "Cooked" (and the card's mark, U5); a `cooked` filter in the
  URL. PR 1: schema, `PATCH`-like route or a field in `PUT` kept by the server (D20 lists the
  server-owned fields — this one is user-owned but not in the form; decide in the PR), seed
  updated. PR 2: the UI.
- **Touches:** `shared/` recipe schema, `server/` recipes routes and index (`{ ownerId,
  status, createdAt }`), `RecipeListPage.tsx`, `RecipePage.tsx`, cook mode; design §6, §7,
  §8, D20.

### U10 — The source on the recipe — `flow` — **medium** — 1 small PR — `proposed`

- **Problem:** the recipe stores `source.url` and never shows it (`m05.md` §8); the rewind
  loop (A17) is exactly when a cook wants the video; nobody in the category offers a way back
  (B synthesis).
- **Change:** "Open the reel" (platform glyph + "Instagram") under the meta line on the
  recipe and as a secondary action in cook mode; opens in a new tab. For `text` and `manual`
  sources, "From a pasted post" / nothing.
- **Touches:** `RecipePage.tsx`, later `CookPage.tsx`. No server change.

### U11 — The recipe reads in its own direction — `look` — **medium** (high for Hebrew cooks) — 1 small PR — `proposed`

- **Problem:** a Hebrew recipe is left-aligned under English headings with markers on the
  left (`recipe-hebrew-360.png`, `m05.md` §9); the forms got `dir="auto"` in M5, the read
  view didn't.
- **Change:** `dir="auto"` on the title, description, each ingredient `li` and each step
  `li`; `text-align: start`; list markers follow direction (`list-style-position` and
  logical padding); the same in cook mode. Headings stay English in v1 (a UI-language
  decision is the user's, §9).
- **Touches:** `RecipePage.tsx`, `RecipeListPage.tsx` card titles, cook mode.

### U12 — Shorter forms — `component` — **medium** — 2 PRs — `proposed`

- **Problem:** an ingredient is four labelled boxes and a button; 14 ingredients are 56
  inputs (`edit-long-360-full.png`, 5,597 px); 35 tag chips open on every form; 240 px inputs
  for two-digit numbers (`m05.md` §13–14).
- **Change:** one ingredient = one row: `Amount` `Unit` `Ingredient` on a line with Note as a
  "+ note" disclosure; Serves/Prep/Cook as short inputs with units in the label; tags as the
  chosen chips plus "Edit tags" opening U7's sheet; Remove as an icon button with an
  accessible name; a sticky Save bar on the form pages (B3). Validation and focus behaviour
  unchanged.
- **Touches:** `RecipeForm.tsx`, `TextField.tsx`, `TagPicker.tsx`. No server change.

### Pass 02 (2026-11-09): U13–U16 — `proposed`

Detail, evidence and wireframes in `pass-02.md` §4 and `wireframes/`. **U13 replaces U1** (a
capture bar on the home) and **U14 absorbs U5** (cards with a face); U6's strip moves to the
Pinch tab.

- **U13 — Two tabs, Recipes and Pinch** — `flow` — **high** — 2 PRs — Must.
- **U14 — A face for every recipe** (the post's picture, else the dish's emoji from Gemini on a
  cuisine tint) — `component` + server — **high** — 2 PRs — Must.
- **U15 — Paste and go** (Paste sends; ⌘V anywhere on desktop) — `flow` — **medium** — 1 PR —
  Should.
- **U16 — Two columns on wide screens** for the recipe and cook mode, cook chrome in the
  recipe's direction — `look` — **medium** — 1–2 PRs — Should.

Suggested order after pass 02: U13 → U14 → U3 → U6 (on Pinch) → U15 → U16 → U7 → U10.

### Later, not proposed yet (needs a decision first, §9)

Servings scaling (out of scope in design §1, table stakes in every competitor, B6/B4/B10);
a shopping list (A6: 66% buy from a recipe); TikTok; export (C4); per-step timestamps to the
reel; UI in Hebrew.

### Suggested order

The user's order (2026-11-09): U4 (2 PRs) → U2 (3 PRs) → M6 → the rest, with the answers
in §9 (U8 later). The look comes first so M6's new screens are styled once.

The suggestion it replaced: U4 (tokens) → U1 → U6 → U5 → U2 → U10 → U3 → U7 → U8 → U9 →
U11 → U12. Its reasoning: U1 + U6 + U5 make the home a library in three PRs; U2 is the one
bold feature; U3 is the trust feature and needs the server; U8 is the phone.

## 9. Questions only the user can answer

1. **TikTok.** The largest Gen Z source (A3, A5) and absent from Pinch. Scope, or stay out?
2. **Who is v1 for?** If it is the household (`[ASSUMPTION]`, §1), Hebrew UI headings and
   RTL layout (U11+) move up; if it is a public POC, English stays and auth matters sooner.
3. **Servings scaling** is out of scope in design §1 and is in every competitor's cook mode.
   Re-open it for U2, or keep it out?
4. **The display font.** ~40 kB for Fraunces against the 165 kB budget: worth it, or system
   type only?
5. **Storing the caption** (text, not media) on the import for U3's "What the post said":
   fine under "media is never stored", but it is a stranger's text kept for up to 7 days
   (the import's TTL). OK?
6. **PWA now or at M7?** U8 changes D7 ("paste in v1, share-sheet channels later").

**The user's answers (2026-11-09):**

1. TikTok: out for now, but kept in mind. Nothing should rule it out.
2. v1 is for the household, so the Hebrew UI and RTL (U11 and later) move up.
3. Servings scaling stays out, in cook mode too.
4. Fraunces is worth it, self-hosted as its own woff2.
5. Storing the caption is OK.
6. PWA (U8): later.
