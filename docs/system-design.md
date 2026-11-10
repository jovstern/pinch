# Pinch — system design

> **Pinch** — pinch a recipe from a reel, cook it later.
> A learning project: system design first, then code that is simple enough to read line by line.

Status: **design agreed, 2026-10-29.** Changes to the design are made in this file.

---

## 1. Requirements

### Functional (v1)

1. **Import from a link.** The user pastes a link to an Instagram, Facebook or YouTube reel or
   video. The system turns it into a structured recipe.
2. **Fallback input.** If a link can't be read, the user can paste the caption text or upload
   screenshots instead.
3. **Draft and review.** An import produces a **draft**. Nothing is saved as a recipe until the
   user reviews, edits and approves it.
4. **Import status.** The user sees each import's progress (`waiting → fetching → analyzing →
   ready to review`) or a readable failure with **Retry**.
5. **Categorize.** The AI tags each recipe by cuisine, meal, diet, flavor and best fit.
6. **Nutrition.** An estimate per serving (calories, protein, carbs, fat), marked as an estimate.
7. **Manage.** Create a recipe by hand, edit it, delete it.
8. **Find.** Free-text search plus tag filters, newest first.
9. **Ownership.** Every recipe belongs to one user and only that user sees it.
10. **Cook mode.** A recipe opens for cooking: one step at a time in large type, with the
    screen kept on (docs/ux/plan.md U2).

### Placeholders (UI only, no backend in v1)

- **Share** — a button that says "coming soon".
- **Comments** — a section that says "coming soon". (When built: its own collection, never an
  array inside the recipe, because it grows without limit.)

### Later

Auth (see §8.3), share, comments, a WhatsApp bot or PWA share target, nutrition from a real
database, semantic search ("recipes like this one").

### Out of scope

Meal planning, shopping lists, scaling servings, Instagram/Facebook **stories** from a link
(they expire after 24h and are usually private; the screenshot fallback covers them).

### Non-functional

| Concern | Target |
|---|---|
| Scale | ~100 users × ~100 recipes (a POC) |
| Responsive | Phone first; works on tablet and desktop |
| Look and feel | Clean and friendly; it should feel finished |
| CRUD latency | < 300 ms |
| Import time | Typically < 60 s, always **asynchronous**: the UI never waits on it |
| Video length | ≤ 3 minutes (checked before downloading when the platform reports it; otherwise right after, see §4.1) |
| Reliability | A crash never loses an import or creates a duplicate recipe |
| Media | **Never stored**, beyond an import's own: a video lives for one attempt, uploaded screenshots until the draft is made (§6). Only text, plus a tiny thumbnail (§5) |
| Cost | Imports per user per day are capped (default 20) |
| Code | Simple and consistent above all — every line should be easy to read |

## 2. Back-of-envelope numbers

- Recipe text ≈ 5 KB, thumbnail ≈ 30 KB → **≈ 35 KB per recipe**.
- 10,000 recipes ≈ **350 MB**: tiny for MongoDB, so one database server is plenty.
- Videos never reach our database. The largest object we hold is a temp video file for about a minute.
- Gemini calls take seconds and cost money. That is why imports are asynchronous and capped.

## 3. High-level design

```mermaid
flowchart LR
  C[React client<br/>Vite · TS · Tailwind] -- "HTTP /api (JSON)" --> A[Express API]
  C -. "poll import status" .-> A
  A <--> M[(MongoDB<br/>users · recipes · imports)]
  W[Import worker<br/>separate process] <-- "claim job / write draft" --> M
  W -- "info + caption (yt-dlp), download for Instagram / Facebook" --> S[Instagram / Facebook / YouTube]
  W -- "YouTube URL, video file or text" --> G[Gemini API<br/>+ Files API]
```

Three processes, one codebase:

| Process | Job |
|---|---|
| **client** | The React app. Talks only to the API. |
| **API** | Express. Validates input, reads and writes Mongo, creates import jobs. Never calls Gemini or downloads anything, so it always answers fast. |
| **worker** | A loop that claims import jobs from Mongo, does the slow work and writes the result back. Started with its own command; can crash or be restarted without touching the API. |

Mongo is the only shared state. There is no Redis, no queue service and no object storage.

## 4. The import pipeline

### 4.1 Flow

1. The client sends `POST /api/imports` with `{ type: "link", url }` or `{ type: "text", text }`.
   The API validates it, finds a link's platform (`instagram | facebook | youtube`), checks the
   daily cap, creates an import with
   `status: "pending"` and answers **202** with the import.
2. The worker **claims** the job, then:
   - **Every link** → read the post's info with `yt-dlp`: its length, checked against the
     limit, and its **caption**, which often holds the full recipe with quantities (D15).
   - **YouTube** → no download: send the URL to Gemini directly (Gemini can watch public
     YouTube videos).
   - **Instagram / Facebook** → one `yt-dlp` call reads the info and downloads to a temp
     folder (100 MB at most, when the platform says the size); upload to the **Gemini Files
     API**. Instagram doesn't report a length, so for it the length is checked after the
     download with `ffprobe` (the spike found reels of 3–11 MB); a long Facebook video is
     downloaded before it's turned down. A post with no video (a photo post) is read from its
     caption alone.
   - **Text / screenshots** (fallback) → send them to Gemini as they are: no `yt-dlp`, no
     video. Pasted text is the post's text, so it's fenced as data like a caption (§9).
3. Gemini gets the video and the caption together and returns JSON that matches our recipe
   schema (structured output), with the fields it was unsure of marked (§6, §9). The worker
   **validates it with Zod**, makes the thumbnail (§5), saves `draft` on the import, sets
   `status: "ready"`.
4. **Cleanup in `finally`**: delete the temp file and the Gemini file. Media lives for about a minute.
5. The client polls `GET /api/imports` (all of them in one request) every 2 s while any is
   pending or processing, then stops; a ready one is opened for review.
6. The user edits and approves → `POST /api/imports/:id/approve` → a recipe is created (with
   the draft's nutrition estimate, which the form doesn't edit) and the import is deleted (§4.4).

### 4.2 States

```mermaid
stateDiagram-v2
  [*] --> pending: POST /imports
  pending --> processing: worker claims (lease)
  processing --> ready: draft saved
  processing --> pending: error, attempts < 3 (retry with backoff)
  processing --> failed: error, attempts = 3
  processing --> failed: not a recipe, or too long (no retry)
  processing --> processing: lease expired (worker crashed), claimed again
  processing --> failed: lease expired on the 3rd attempt
  failed --> pending: user clicks Retry
  ready --> [*]: approve → recipe created, import deleted
  ready --> [*]: discard → import deleted
  failed --> [*]: dismiss → import deleted
```

`step` (`fetching | analyzing`) is shown inside `processing` for progress. The extractor sets
it as each part starts (a link is fetched, then analyzed; a text is only analyzed), only while
the attempt still holds the job, as every worker write. A claim starts it empty, and every end
of an attempt clears it.

### 4.3 Worker mechanics (the queue lessons)

- **Atomic claim.** One `findOneAndUpdate` both finds and takes a job, so two workers can never
  take the same one:
  ```js
  findOneAndUpdate(
    { $or: [
        { status: "pending", nextAttemptAt: { $lte: now } },
        { status: "processing", leaseUntil: { $lt: now } },   // a crashed worker's job
    ] },
    { $set: { status: "processing", leaseUntil: now + 3min }, $inc: { attempts: 1 },
      $unset: { step: "" } },                                   // a crashed attempt's step
    { sort: { createdAt: 1 } },
  )
  ```
- **Lease.** If the worker dies mid-job, `leaseUntil` passes and the job is claimed again (the
  same idea as an SQS visibility timeout).
- **Deadline.** A whole attempt must finish inside its lease, or a second worker would claim a
  job that is still running. So each attempt has a deadline under the lease (about 150 s),
  and every external call in it (`yt-dlp`, upload, Gemini) has a timeout inside that. In the
  spike one Gemini call hung for 27 minutes. A timeout is a failed attempt and retries as usual.
- **Retries with backoff.** A failed attempt goes back to `pending` with `nextAttemptAt` = now +
  10 s, then 60 s. After 3 attempts → `failed` with a readable `error`. A failure no retry can
  fix (not a recipe, a video over 3 minutes) fails the import at once, with its own message
  and `noRetry: true` (D23): the list offers only Dismiss, and the API refuses its retry. A
  job whose worker died on its third attempt is failed when it's claimed again, not run a
  fourth time.
- **Back-pressure.** At most **2 jobs at a time** per worker, to stay within Gemini rate limits.
- **Idle polling.** With nothing to do, the worker checks again after 1 s.
- **Errors don't stop it.** A database error (Mongo restarting) is logged, and the loop tries
  again after 1 s, rather than end the worker: in development nothing would start it again. A
  job it held is claimed again when its lease runs out.
- **Stalled.** An import still unclaimed 5 minutes after it was due (`nextAttemptAt`, or a
  held one's `leaseUntil`) means no worker is running: the API marks it `stalled`, and the
  client says so and offers Dismiss instead of "working on it" forever. Not exact: with more
  than about four links queued ahead (two at a time, up to 150 s each), a waiting one shows as
  stalled though the workers are busy. Fine for one user; a worker heartbeat would be exact.
- **Expiry.** Every import has `expiresAt` = 7 days; a **TTL index** makes Mongo delete abandoned
  imports by itself.

### 4.4 Approve is idempotent

Approve does two writes: create the recipe, delete the import. A crash between them must not
create a duplicate recipe when the user clicks again.

- The recipe stores `sourceImportId` under a **unique, sparse index**.
- Approve: insert the recipe; on duplicate-key error (`11000`) treat it as "already done"; then
  delete the import. The recipe's `source` is the import's link and platform.
- Repeating approve always ends with exactly one recipe and no import. No transaction and no
  replica set needed. (Chosen over a transaction: §8, decision D9.)

### 4.5 Link extraction risks

| Source | How | Risk |
|---|---|---|
| YouTube | Gemini reads the URL; `yt-dlp` reads the length and caption | Low; public videos only |
| Instagram reel/post | `yt-dlp` download | Medium: breaks when Instagram changes; public posts needed no cookies in the spike; a grey area under Instagram's terms — acceptable for a personal POC, not for a product |
| Facebook reel | `yt-dlp` download | Same as Instagram |
| Stories | Not supported from a link | Use the screenshot fallback |

**The spike (M0)** measured this before building anything else: 12 real links (6 YouTube, 3
Instagram, 3 Facebook). `yt-dlp` read all of them without cookies; Gemini turned 10 into
recipes, correctly rejected one promo, and one call hung. Results and findings are in
`docs/spike-results.md`.

## 5. Thumbnails

Media is thrown away, but a good-looking list needs images, so each recipe keeps **one tiny
thumbnail** inside its document: WebP inside 400 × 500 (its own shape kept), 20–40 KB, made
with `sharp`, with its width and height so the page keeps its place before it loads. The
worker saves it on the import as soon as it has it (as the step), reading at most 5 MB, from
https, with no redirect; approve copies it to the recipe, and editing keeps it (D20). Making it
never fails an import: no picture, no thumbnail.

| Source | Thumbnail from |
|---|---|
| Instagram / Facebook / YouTube | The post's own picture (`yt-dlp`'s `thumbnail`: the reel's cover, YouTube's image), fetched at once (the platforms' links expire) and resized. Chosen over a frame cut with `ffmpeg`: the cover is the picture the author chose, and one path serves all three |
| Screenshots | The first screenshot, resized |
| Text / manual | None → the recipe's emoji on a soft tile (D25) |

Served by `GET /api/recipes/:id/thumbnail` (a draft's by `GET /api/imports/:id/thumbnail`) with
long cache headers; every query that answers recipes or imports leaves the image out, so list
responses stay small.

## 6. Data model (MongoDB)

```ts
User {
  _id, email, name, createdAt
  // passwordHash etc. arrive with auth (§8.3)
}

Recipe {
  _id, ownerId, title, description?,
  ingredients: [{ name, quantity?, unit?, note? }],   // quantity is text: "1/2", "a pinch"
  steps: [string],
  tags: [string],                  // "cuisine:italian", "flavor:spicy" — see §7
  servings?, prepMinutes?, cookMinutes?,
  nutritionPerServing?: { calories, proteinG, carbsG, fatG },   // always Gemini's estimate (D14)
  emoji?: "🍲",                    // its face without a picture (D25): the model's, or its title's
  thumbnail?: { webp: Binary, width, height },   // the image left out of every query that answers
  source: { type: "instagram" | "facebook" | "youtube" | "text" | "image" | "manual", url? },
  sourceImportId?,                 // unique + sparse (§4.4)
  createdAt, updatedAt
}

Import {
  _id, ownerId,
  status: "pending" | "processing" | "ready" | "failed",
  step?: "fetching" | "analyzing",
  input: { type: "link" | "text" | "images", url?, platform?, text?, count?, images? },
  attempts, nextAttemptAt, leaseUntil?, error?, noRetry?,
  draft?: RecipeDraft, thumbnail?: { webp: Binary, width, height },   // named as on a recipe
  createdAt, updatedAt, expiresAt   // TTL
}

RecipeDraft = RecipeInput + {
  nutritionPerServing?,
  emoji?,                          // one food emoji for the dish (§9, D25)
  uncertain?: [{ path, reason }]   // "things to look at": up to 10 (§9); for the review only
}

Usage {                            // the daily cap (D22)
  ownerId, day: "2026-11-07",      // the UTC day
  imports,                         // links pasted + Retry clicks that day
  expiresAt                        // TTL: two days later
}
```

A draft's `uncertain` marks the fields the model was unsure of, or couldn't find, with a short
reason: `{ path: "ingredients.3.quantity", reason: "the video says a can" }`. A path names a
field as the API's errors do (§8.1): `title`, `servings`, `prepMinutes`, `cookMinutes`,
`steps.N`, or `ingredients.N.quantity` / `.unit` / `.name`. They're a hint, so they never fail
a draft: a reason is cut to 200 characters; a list that isn't one (null, a mark with no path or
reason) is dropped whole; a mark that names no field of the draft (malformed, or past the last
step), has an empty reason or repeats a field is dropped; the first 10 are kept. The draft's
schema checks them when the worker saves the draft and again whenever the API reads it. A saved recipe doesn't keep them: approve takes the form's
recipe (§8), which has no marks.

A recipe's `emoji` is its face when it has no picture (D25): one emoji, which the model picks for
the draft and approve copies, as the nutrition; a recipe written by hand gets the one its title
names, from a short list of dishes in English and Hebrew (`server/src/titleEmoji.ts`: "soup" 🍲,
"סלט" 🥗; the first match in the list wins), or none. Like the marks it is a hint, so it never
fails a draft: the check keeps exactly one pictographic grapheme (an emoji, a ZWJ sequence or one
with a skin tone, at most 16 code units) and drops anything else, flags and keycaps included,
whenever the schema reads it; a browser without `Intl.Segmenter` drops them all. The user doesn't
write it, and editing keeps it (D20); a recipe with none (saved before it, or a title the list
doesn't know) shows a plate, 🍽️.

Uploaded screenshots for the fallback (up to 4 PNG, JPEG or WebP files, each made a JPEG at
most 1600 px on a side by the API: typically 200–400 KB, under 2 MB at worst) are held on the import (`input.images`) only until the draft is made:
a failed attempt keeps them for the next try; the import's TTL deletes them in any case.
Every query that answers imports leaves them out.

### Indexes

| Collection | Index | Serves |
|---|---|---|
| recipes | `{ ownerId: 1, tags: 1, createdAt: -1, _id: -1 }` | My recipes, filtered by tags, newest first |
| recipes | `{ ownerId: 1, createdAt: -1, _id: -1 }` | My recipes, no filter, cursor pagination |
| recipes | `{ ownerId: 1, title: 1, _id: 1 }`, collation `en`, strength 2 | My recipes A–Z, whatever the case |
| recipes | `{ ownerId: 1, title: "text", "ingredients.name": "text" }` | Text search inside my recipes |
| recipes | `{ sourceImportId: 1 }` unique, sparse | Idempotent approve |
| imports | `{ status: 1, nextAttemptAt: 1 }` | The worker's claim query |
| imports | `{ ownerId: 1, createdAt: -1, _id: -1 }` | "My imports" list in the UI |
| imports | `{ expiresAt: 1 }` TTL (`expireAfterSeconds: 0`) | Automatic cleanup |
| usage | `{ ownerId: 1, day: 1 }` unique | Today's count (the daily cap) |
| usage | `{ expiresAt: 1 }` TTL | Old days go |

Every index is checked with `.explain("executionStats")`: expect `IXSCAN`, and
`totalDocsExamined` close to `nReturned`.

**Sample data:** `npm run db:seed` adds ten sample recipes for the dev user (§8.3), so the
list, search and filters have something to find; the e2e run seeds its own database the same
way. Each sample has a fixed id and is written only when it's missing: running it again
leaves an edited sample as it is, and puts back one that was deleted.

## 7. Find

**Tags are one flat array of `facet:value` strings.** MongoDB can't put two array fields in one
compound index ("parallel arrays"), so separate `cuisine[]` and `flavor[]` arrays could not be
indexed together. One array can.

Facets and their allowed values (fixed lists, so filters stay clean; the AI must pick from them):

| Facet | Values (first draft) |
|---|---|
| `cuisine` | italian, asian, middle-eastern, mexican, american, french, indian, mediterranean, other |
| `meal` | breakfast, lunch, dinner, snack, dessert, drink |
| `diet` | vegetarian, vegan, gluten-free, dairy-free, kosher-dairy, kosher-meat, parve |
| `flavor` | sweet, savory, spicy, sour, smoky, fresh |
| `fit` | quick, weeknight, meal-prep, party, kids, healthy, comfort |

Queries:

- **Filters only:** `{ ownerId, tags: { $all: [...] } }`, sorted by `createdAt: -1`, **cursor
  pagination** on `(createdAt, _id)`: the next page asks for items older than the last one seen.
  (`skip` reads and throws away every skipped document, so it gets slower page by page.)
- **The cursor** is the last recipe's `(createdAt, _id)`; the next page is
  `{ $or: [{ createdAt < c }, { createdAt = c, _id < id }] }` plus a plain `createdAt ≤ c`.
  Without that range, Mongo's chosen plan scanned the index from the newest recipe and dropped
  the pages before (`explain`: 101 documents read for a page of 51). A page asks for 51 and
  answers 50, so `nextCursor` is null on the last page instead of pointing at an empty one.
- **Tags:** the index holds one entry per tag of a recipe (multikey), so with two tags the scan
  reads the recipes with the **first** tag of `$all` and checks the other on each; Mongo doesn't
  pick the rarer one. With every recipe a dinner and half Italian, `cuisine:italian,meal:dinner`
  reads 51 documents for a page of 51 (`explain`, in a test), `meal:dinner,cuisine:italian`
  reads 101. Either is fast at this scale, and never more than my recipes with that one tag; if
  it matters later, the route can put the narrower facet first.
- **Sort, Time and Source** (M8 F1): `sort` is `newest`, `quickest` or `az`; left out, newest
  first, or with a search, the best match first. Each order sorts by one value, then `_id` the
  same way, and the cursor is the order, that value and the `_id` (`newest:<ms>_<id>`,
  `quickest:<minutes>_<id>`, `az:<title>_<id>`), so a cursor sent with another order is a 400. A–Z ignores case (a collation, `en` strength
  2, and an index with the same one). A recipe's time is prep and cook together, or the one it
  has; one with neither counts as longer than any (Quickest puts it last, a time filter leaves it
  out). No recipe stores that sum, so `time=15|30|60` is an `$expr` and Quickest an `$addFields`
  before the sort: both read every one of my recipes the other filters leave, rather than an
  index (one household's library: hundreds, at most a few thousand). `source=instagram,manual`
  is any of the sources (`manual` is "Written by me"; pasted text and screenshots have no
  filter). The query is one aggregation, so every filter and order goes together.
- **Text search:** `{ ownerId, $text: { $search: q } }` plus the same filters; its 50 best
  matches by text score (`_id` breaks ties), best first, or in the order asked when `sort` is set. At POC scale
  that is enough; no deep pagination for search. A recipe matches if any word of `q` is in its
  title or an ingredient's name. The text index
  stems English ("eggs" finds "egg"); Mongo has no Hebrew stemmer, so Hebrew matches whole
  words only ("חריף" doesn't find "חריפה"). Quotes ask for a phrase and a leading "-" leaves a
  word out (Mongo's `$search` syntax); a search of only stop words ("the") finds nothing.
  Smarter search is semantic search, later (§1).

## 8. API

All under `/api` (the health routes too, so the Vite proxy covers everything), JSON, errors as
`{ error: { code, message } }` (plus `fields` for invalid input, §8.1). `ownerId` always comes from
the request's user (§8.3), never from the body or the URL.

```
GET    /api/health                     the process is up
GET    /api/ready                      the database is reachable

GET    /api/recipes?q=…&tags=cuisine:italian,flavor:spicy&source=instagram,manual&time=30&sort=quickest&cursor=…   → { items, nextCursor } (no sort: newest first, or with q the best match first)
POST   /api/recipes                    create by hand (its emoji from its title, §6)
GET    /api/recipes/:id
PUT    /api/recipes/:id                replace what the user can edit (the form sends it all)
DELETE /api/recipes/:id
GET    /api/recipes/:id/thumbnail      image/webp

POST   /api/imports                    { type: "link", url } | { type: "text", text }  → 202 import (429 past the daily cap)
POST   /api/imports/screenshots        a form: up to 4 images (10 MB each) as "images"  → 202 import { type: "images", count }
GET    /api/imports                    my imports that are not done yet (a ready one's draft with its marks: the queue counts them)
GET    /api/imports/:id                status, step, error, draft (with its uncertain marks, §6)
GET    /api/imports/:id/thumbnail      image/webp: the draft's picture
POST   /api/imports/:id/approve        the edited draft, as POST /api/recipes; nutritionPerServing, the emoji and the thumbnail from the stored import (D20), the marks dropped → 201 recipe (409 if not ready)
POST   /api/imports/:id/retry          failed → pending, attempts, error and noRetry cleared → 202 (409 if not failed, or noRetry)
DELETE /api/imports/:id                discard / dismiss
```

One set of **Zod schemas** defines the Gemini output, the API input and the TypeScript types,
so they can't drift apart.

### 8.1 Validation

Every request body and query string is parsed with Zod before it reaches the handler. Invalid
input → 400 `invalid_input` with `fields`: each failed field by its path and a message the form
can show, e.g. `{ "title": "Give the recipe a title.", "ingredients.0.name": "Name the
ingredient." }`. A missing body, or one that isn't JSON → 400 `bad_request`; too large → 413
`too_large`.

The form checks with the same schema before it sends (shared `fieldErrors` builds `fields` on
both sides), so the user sees the API's messages without a round trip; the API's 400 is still
shown the same way, under the field it names.

### 8.2 Errors

Handlers throw; one Express error middleware turns errors into the JSON shape above and logs
them. No try/catch in each route.

### 8.3 Auth — later, but designed in now

v1 has no login. A small middleware sets `req.userId` from config `DEV_USER_ID` (not a secret,
so it has a default and needs no `.env` entry; `db:seed` creates that user when users are needed).
Every query already filters by `ownerId: req.userId`. When auth is built, **only that middleware
changes**. The planned design:

- Passwords hashed with argon2id (or bcrypt); emails stored lowercase.
- A random 32-byte session token in an `HttpOnly; Secure; SameSite=Lax` cookie. The database
  stores only its SHA-256 hash in a `sessions` collection with a TTL index.
- CSRF: SameSite=Lax, one origin (Vite proxies `/api` in dev), JSON-only mutations.
- A new session on every login, the same error for wrong email or password, and a login rate limit.
- Out of the first auth milestone: password reset, email verification, Google sign-in.

## 9. Gemini

- One function, `geminiExtract` (`server/src/worker/geminiExtract.ts`): an import's input → the
  model's JSON, which the worker checks with Zod. The worker doesn't know anything else about
  Gemini, so the model or provider can change in one place.
- The current Gemini Flash model (`gemini-3.5-flash`, checked in M5), with **structured
  output**: the response schema is generated from the Zod schema (`z.toJSONSchema`, input
  side), without `maxItems`, which Gemini refuses; Zod still checks those limits.
- The input is the video (or text / screenshots) **plus the post's caption** (D15). The caption
  is a stranger's text: it is sent as data to read, never as instructions, and the output is
  still bound by the schema, Zod and the user's review.
- The prompt asks for: title, ingredients with quantities and units, steps, servings, times, tags
  from the fixed lists only, and a nutrition estimate per serving. If the video isn't a recipe,
  the model says so and the import fails with "This doesn't look like a recipe".
- It also lists, in `uncertain`, up to 10 fields it was unsure of or couldn't find, each by
  its path with a short reason (§6): the user's "things to look at" when reviewing. The
  prompt names the paths it may use. A mark never fails an import: a reason is cut to 200
  characters, and a malformed list or a mark that names no field is dropped (§6).
- And one food emoji that fits the dish (`emoji`), the face of a recipe without a picture (D25).
  It is a plain string in the response schema; Zod keeps it only if it's one emoji (§6).
- The recipe is written **in the language of the post**; tags stay English codes (D16).
- Every call has a **timeout** (the client's: 120 s a request), and the attempt's deadline
  (§4.3) cuts the whole attempt. No retries of its own (the SDK only retries when asked), except
  an upload's chunks, which the SDK tries up to 3 times: the worker's retries are the others.
- The worker uses the fake extractor of M4 instead when `EXTRACTOR=fake`: e2e runs that way,
  so no test calls Gemini.
- The output is validated with Zod anyway; invalid output counts as a failed attempt. The
  model often returns `""` for a field it doesn't know (e.g. `unit`); the schema treats an
  empty string as "not set".

## 10. Decisions log

| # | Decision | Why | Rejected |
|---|---|---|---|
| D1 | Import produces a draft that the user approves | AI makes mistakes; nothing wrong gets saved | Saving straight away |
| D2 | Asynchronous imports with a job document | Imports take up to a minute and can fail; requests must not wait | One long request |
| D3 | A separate `imports` collection | Recipes stay clean; different shape and lifecycle; TTL cleanup | A `status` field on recipes |
| D4 | Mongo as the queue (atomic claim + lease) | No extra infrastructure; teaches how queues work | Redis + BullMQ |
| D5 | The worker is a separate process | Crash isolation; scales on its own; the API always stays fast | Worker inside the API process |
| D6 | No media stored; only a ~30 KB thumbnail | Less to store and protect; the list still looks good | Object storage; no images; hot-linking (Instagram image URLs expire) |
| D7 | Paste a link in v1; share-sheet channels later | Works everywhere today; every channel later just creates an import | WhatsApp bot, PWA share target, iOS Shortcut in v1 |
| D8 | `yt-dlp` for Instagram and Facebook, with a spike first and fallbacks | The only way to get the reel itself; fallbacks keep the user unblocked | Caption-only scraping, Meta oEmbed |
| D9 | Idempotent approve (unique `sourceImportId`) | Safe to repeat; works on a standalone Mongo | A transaction (needs a replica set) |
| D10 | Tags as one `facet:value` array from fixed lists; renaming or removing a value needs a migration of the stored recipes | One compound index; clean filters | Separate arrays per facet; free tags |
| D11 | Cursor pagination | Constant speed at any depth | `skip` / `limit` |
| D12 | Gemini | Reads video and YouTube URLs natively; has a Files API | Claude (needs frames + transcript for video) |
| D13 | Auth later, behind a dev-user middleware | Learn the core first; ownership is in every query from day one | Building auth first |
| D14 | Nutrition estimated by Gemini, labelled as an estimate | Good enough for a POC | A nutrition database lookup (later) |
| D15 | Send the post's caption to Gemini with the video | The spike: quantities are often only in the caption (missing quantities fell from 42/106 to 13/101), and it helps spot non-recipes | Video only |
| D16 | The recipe is in the language of the post | Nothing lost in translation; the model's choice was unstable without a rule | Always Hebrew; always English |
| D17 | The server runs on Node 24's built-in TypeScript type stripping | One fewer dependency; the spike already runs this way | `tsx` (node-api.md's default) |
| D18 | Schemas in an npm-workspace package `shared/`, used as TypeScript source with no build: its `exports` point at `src/index.ts`; Vite compiles it, and Node type-strips it because the workspace symlink resolves to a path outside `node_modules` | One copy for client and server, no build step | `server/src/schemas/` (node-api.md); a copy on each side; a built package |
| D19 | MongoDB through the native driver; Zod checks every write, and every response is parsed with its schema, which drops stored fields like `ownerId` | You see the real queries, which suits learning indexes; one schema layer, shared with the client | Mongoose (a second schema layer next to Zod) |
| D20 | Editing is `PUT`: it replaces what the user can edit and keeps the fields the server owns (`_id`, `ownerId`, `source`, `createdAt`, `sourceImportId`, `nutritionPerServing`, `emoji`, `thumbnail`), listed in the route | The form always sends the whole recipe, so a field the user clears is simply left out; no `null`/`""` rules | `PATCH` with `null` to clear a field |
| D21 | React Router (declarative: `<Routes>` in `App.tsx`, `useParams`, `Link`) | A handful of screens; the most familiar API and the least setup, easy to read line by line | TanStack Router (type-safe routes and loaders, more concepts) |
| D22 | The daily cap (20) counts links pasted and Retry clicks, in a per-user, per-UTC-day counter (`usage`) raised atomically by both routes; past it, 429 | Imports are deleted once done, so counting them would undercount; the unique `{ownerId, day}` index makes two first counts at once safe on a standalone Mongo (as D9); the routes are where a user asks for work; automatic retries (3 a link) aren't counted, so at most 60 Gemini calls a day | Counting each Gemini call in the worker (exact, but a link could be accepted and then fail with "limit reached") |
| D23 | "Not a recipe" and "too long" fail the import at once (`NoRetryError`, its message shown to the user); every other error is retried | Trying again gives the same answer and costs a Gemini call each time; the user learns why straight away; nor is the user offered a Retry that can't help, and would use one of the day's 20 | Retry everything (3 Gemini calls for a cat video, and a vague message) |
| D24 | Two tabs, **New recipe** (`/`, the default) and **My recipes** (`/recipes`); the import queue sits under the box on New recipe; every inner page has breadcrumbs (docs/ux/pass-02.md §12–13) | Adding is the main event, so it opens first; the split keeps the form off the library; breadcrumbs say where a page belongs and replace Exit and "‹ Recipes" | One home with the box above the recipes; Recipes as the default tab; a bottom tab bar |
| D25 | Every recipe has a face: the post's picture, else an emoji the model picks for the dish (an optional `emoji` on the recipe and the draft) on a soft tile; a recipe written by hand gets one from its title (§6) — built in M8 F3 | The picture is what the user remembers; a recipe with none still needs something to recognise; the title's list keeps it to the server, and the editor's JS at its budget | Grey placeholders; generated images; an emoji field in the editor; a map from the tags on the client |
| D26 | The UI is built from **shadcn/ui** components, copied into `client/src/components/ui/`, their variables mapped onto Pinch's tokens; controls 44 px tall for touch | Accessible Radix parts (Tabs, Sheet, DropdownMenu, Dialog, toasts) whose code lives in the repo and can be read line by line; one pattern per control | Pinch's own components only; a packaged kit (MUI, Chakra) |

## 11. Risks

| Risk | Mitigation |
|---|---|
| Instagram/Facebook block `yt-dlp` | The spike first; fallback to text or screenshots; keep `yt-dlp` updated |
| Gemini invents ingredients or quantities | The caption as a second source (D15); draft review; Zod validation; a prompt that allows "unknown" |
| Nutrition numbers are wrong | Shown as "≈ estimate" |
| The estimate isn't redone when servings or ingredients are edited: it's Gemini's, for the draft as it came | Shown as "≈ estimate"; a nutrition database later (D14) |
| Gemini cost or rate limits | Daily cap per user; 2 jobs at a time; videos ≤ 3 min |
| Long or non-recipe videos | Length check before download (right after it when the platform doesn't report a length); "not a recipe" failure |
| A Gemini call hangs | A deadline per attempt under the lease, a timeout on every call (§4.3); then the normal retry |

## 12. Build plan (small PRs)

Each milestone is a few **small PRs** (roughly ≤ 300 changed lines each), which you read and merge.

| # | Milestone | Done when |
|---|---|---|
| M0 | **Spike** — `yt-dlp` + Gemini on real links (a script, not app code) | We know which sources work and the design is adjusted |
| M1 | **Scaffold** — client (Vite, React, TS, Tailwind), server (Express, TS, Mongo), dev-user middleware, error handling, one health route | Both run; the client calls the API |
| M2 | **Recipes CRUD** — create by hand, list, detail, edit, delete; responsive layout | A user can manage recipes by hand |
| M3 | **Find** — tags, text search, cursor pagination, indexes checked with `explain` | Search and filters are fast and correct |
| M4 | **Pipeline without AI** — imports, worker, claim, lease, retries, TTL, status UI, idempotent approve, using a fake extractor | The whole pipeline works and survives a killed worker |
| M5 | **Gemini** — `extractRecipe` for YouTube and text, tags, nutrition | A YouTube link becomes a draft |
| M6 | **Instagram / Facebook** — `yt-dlp`, Gemini Files, thumbnails, screenshot fallback | A reel link becomes a draft with a thumbnail |
| M7 | **Polish** — empty, loading and error states, share and comments placeholders, look and feel | It feels like a finished POC |
| M8 | **Redesign** (docs/ux/pass-02.md): the two tabs, shadcn/ui, the queue, filters, the recipe, cook mode, one editor; then the features it asks the API for | The wireframes in `docs/ux/wireframes/` are the app |
| Later | Auth, share, comments, WhatsApp bot / PWA share target, nutrition database, semantic search | — |

Doing M4 with a fake extractor first is deliberate (it takes 1.5 s a step, and fails every try of a link
with "fail" in it, to show retries): the queue lessons are learned without AI
noise, and M5/M6 only swap the extractor.

## 13. Open for the coding stage

- **Tests:** what gets tested first (the claim query, approve, Find queries).
- **The lighter kit:** how much of the agents setup to keep, given that you own the code and want small PRs.

## 14. Screens

Phone first (§1); the wireframes in `docs/ux/wireframes/` (pass 02, revision 2) show each
screen at 360 and 1440 px. Every page sits in one frame (D24): a header of two tabs, **New
recipe** (its badge counts drafts ready to review) and **My recipes**, then an avatar (a "coming
soon" placeholder until auth arrives, §8.3; a menu waits for something to put in it: the
theme follows the system). **Write a recipe** is on both tabs: in the header from
768 px, a floating button at the bottom right on a phone. No logo for now. Inner pages have
breadcrumbs under the header, and the tab they belong to stays selected. Every async change to
a recipe's status confirms itself in a toast, with the next step when there is one: sent,
ready to review (Review; its description counts the things to look at), failed (Retry), saved, changes saved, deleted, discarded, couldn't save
(Try again). Saved has no View: saving already opens the recipe. Couldn't save is for the
one-click actions (Dismiss, Discard, the toast's Retry); a form keeps its error by its fields, and
Delete's stays in its dialog. Undo waits for the API (M8 F4). A status change toasts even when
its card shows it too: one rule everywhere, chosen over ui-craft's "toasts only for things
off-screen". Toasts sit at the top on a phone, under the header, and bottom right from 768 px
(except in the editor, where they stay at the top, clear of its Save; opening a draft closes its
"ready to review" toast); they are the queue's announcements too (Sonner's region is live).

| Address | Screen | Its job | States |
|---|---|---|---|
| `/` | New recipe | One input for a link or a post's text (it grows into a textarea, up to 6 lines, once the text wraps or has a new line, and a link stays one line; one word is a link, anything with a space or a new line is text, as before; Enter sends, Shift+Enter a new line), Paste (into the field, not sent), **Pinch it**; add up to 4 screenshots. Under it the queue, "Cooking… · N ready" ("N ready" once nothing cooks): each import as a card with its picture (or a placeholder while it cooks; a ready draft without a picture, its emoji, D25), its title or link, and where it has got to ("Ready to review · ◆ 3 things to look at" when the model marked fields, §6); a ready one offers Review, one still cooking a disabled "Cooking…" button in Review's place, a failed one Retry (unless D23) and Dismiss, a stalled one Dismiss | Empty queue (one line on what Pinch does, the three platforms); the queue can't load (Try again); a link from another site or too short a text refused under the input; 429 says the day's limit |
| `/recipes` | My recipes | Search (titles and ingredients; it runs on Enter), tag chips (five common tags, fixed: counting the household's most-used needs an API of its own), and Filters (§7): Sort (Newest, Quickest, A–Z; while searching, Best match comes first and is the default, and the others are followed only once picked), Time (Any, 15 min or less, 30 min or less, 1 hour or less), Source (Instagram, YouTube, Facebook, Written by me), then the five tag facets. On a phone they are a bottom sheet of chips (a dialog in the middle from 768 px, as every sheet), each applied as it's picked; its Clear takes the filters off and keeps the order, and "Show N recipes" closes it, counting what the list has loaded ("Show 50+ recipes" when more pages follow, "Show the 50 best" for a full search); the Filters button counts the filters on, not the order. From 1024 px they are a panel of radios and checkboxes on the left (no per-value counts: one more query per value), Sort is a select beside the search (shadcn's NativeSelect), the applied filters also repeat as removable chips by the count, and a "Skip the filters" button (shown while focused) takes the keyboard past the panel to the search. Clear all and Clear filters keep the order. Filters live in the address (`/recipes?q=egg&tags=meal:dinner&source=instagram&time=30&sort=quickest`; the default order is left out, and a value written twice is read once). A grid of cards (2 columns, 3 from 768 px, 4 from 1024, 5 from 1280): picture with its site's name on it (none for a hand-written recipe; where there's no picture, the recipe's emoji on a soft tile, D25, or a plate 🍽️ when it has none), title, then time and ingredient count ("10 min · 2 ingredients") | Loading (cards' shape), no recipes yet (a way to New recipe), none match (names the search and tags; Clear filters, or Clear search when only a search is on, and Search all recipes for the words when tags were also on), error (centred, as the empty states; Try again); 50 at a time, then Show more |
| `/recipes/:id` | A recipe | Breadcrumbs *My recipes › title*; the picture (without one, its emoji on a soft band, lower than a picture's: D25); the title and a subtitle naming the source (Instagram, YouTube, Facebook: a link to the post, named by its site until the API keeps the author; "From pasted text" or "From screenshots" for an import without a link; or "Written by you"), serves and times; tags (each opens My recipes filtered by it); **Cook**; ⋯ with Edit, Share ("coming soon") and Delete (asks first); nutrition ≈; ingredients beside the steps from 1024 px; Comments ("coming soon") | Loading (none when opened from My recipes: the list's copy shows while it loads), error (Try again), not found |
| `/recipes/:id/cook` | Cook mode | Breadcrumbs *My recipes › title › Cook* (no Exit), the source in the subtitle; one step per card, swiped sideways (native scroll snap; the next card peeks 24 px, and a tap on it brings it in; the step is set once the row has stopped for 100 ms), ‹ › and dots kept for those who don't swipe (dots up to 7 steps), Back and Next instead from 768 px, and the ← → keys (not from a field, menu or dialog); "Step 2 of 6" and a bar; the step's ingredients on its card, all of them folded below (a panel on the left from 1024 px), ticked off in both at once; on the last step › or Next turns into Done; timers, Wake Lock and Done as before (§14 of M7: started once, kept at the bottom, ringing at zero, ended on leaving), and below 1024 px the timers and the ‹ › (Back, Next) row share one footer pinned to the bottom, so a short phone never hides one under the other; a timer reads "19:58 left · 20 min timer"; each card is as tall as its step, from 768 px a card fills the row (no peek) | Loading (the step's shape), error (Try again), not found |
| `/recipes/new` | Write a recipe | The editor, empty (breadcrumbs *New recipe › Write a recipe*), under a tip: got it as text? Paste it on New recipe. Title (examples as placeholders), description, ingredients as amount · unit · name rows with a note (on its own line on a phone) and ✕, steps as numbered boxes with ✕, Add ingredient and Add step (Paste a list and reordering aren't built: nothing parses a pasted line yet, and the form never had an order to change); then the source ("Written by you"), serves and times, and tags as chips with ✕ and Add tag (a sheet of the facets, as Filters); Cancel and **Save recipe** pinned to the bottom. No picture by hand, and no Change picture or source link: the API has no upload and keeps the source (D20) | Each error under its field from the first Save (§8.1), focus on the first, "N things to fix before saving" above the Save bar; saving; failed (keeps what was typed) |
| `/recipes/:id/edit` | Edit a recipe | The same editor, filled, with its picture (*My recipes › title › Edit*); Cancel and **Save changes** | Loading, error, not found; then as Write a recipe |
| `/imports/:id` | Review a draft | The same editor, filled from the draft (*New recipe › Review: title*), with its picture, under a banner that says where Pinch read it (the site, the text you pasted, your screenshots) and links to the post (Watch the video). The fields the model was unsure of (§6) are marked: a dashed box, and under its row ◆ and the reason, which the box points to (`aria-describedby`); changing the field clears its mark, and removing a row moves the marks of the rows under it. Under the banner, "◆ N things to look at, marked below" and Go to the first (focus on the first marked box). Marks don't block Save, and a saved recipe doesn't keep them. Discard (asks first, "Discard this draft?" with its title as it is now, then the toast; not while saving) and **Save to My recipes** (approves it and opens the recipe) | Loading, error; no draft yet, or no such import (says so, links to New recipe); then as Write a recipe |
| anything else | Page not found | Get back to My recipes | — |

After Save, Save changes, Delete or a draft's Discard, the page that opens takes the focus on its
heading, so the keyboard carries on from there rather than from the page's start.

Leaving the editor with changes asks once: Cancel ("Discard your changes?"), a draft's Discard
(always, as it deletes it), and closing or reloading the tab (the browser's own question). A
link inside the app (a breadcrumb, a tab, Back) doesn't ask: that needs a data router's
`useBlocker`, and the router is declarative (D21). Two columns from 1024 px: what you edit most
(title, ingredients, steps) on the left, the picture, source, details, tags and Save on the
right, which stays in view (and scrolls itself on a short screen). On a phone the page reads in
the same order (source, details and tags after the steps; only the picture comes first, as on a
recipe's page), so the keyboard and the eye go the same way; the Save bar's buttons are a
phone's width up to 1024 px.
