# UX research — sources

Appended each pass; the method is `.claude/skills/ux-strategy/SKILL.md`. Every entry: the
link, what the page actually says (numbers and quotes as written there), and **the one thing
worth taking** for Pinch. A claim with no source in here is marked `[ASSUMPTION]` in
`plan.md`. Pages that could not be read are listed at the end of each pass, so nobody retries
them and nothing is cited from memory.

## Pass 1 — M5, 2026-11-08

### A. Who saves recipes from reels, when, and what goes wrong

**A1. Home Run Inn, "Cooking habits: Gen Z vs Millennials"** (16 Aug 2023; US survey, July
2023, 1,000 Gen Z 18–26 + 1,000 Millennials 27–42, ±3%; brand-commissioned, pollster unnamed)
<https://homeruninnpizza.com/news-blog/fun-facts/cooking-habits-gen-z-millennials>
56% of Gen Z use TikTok for cooking support vs 29% of Millennials; 66% of Millennials browse
YouTube for new dishes; 71% / 67% watch cooking videos on their devices; only 60% of Gen Z vs
66% of Millennials "bother with following recipes"; "the biggest deterrent is the time cost of
meal preparation". **Take:** two audiences arrive from two platforms (TikTok/Instagram vs
YouTube); 40% of the younger group don't follow recipes, so a pinched recipe must read as a few
steps, not a formal card.

**A2. Morning Consult, "Gen Z, social media, restaurants and recipes"** (2 Jul 2025; 1,001 Gen Z
13–28, ±3) <https://intel.morningconsult.com/mc-content/analysis/gen-z-social-media-restaurants-recipes>
45% say social media influenced them the last time they tried a new recipe; 21% tried 5+ new
recipes in the past month; 50% of Gen Z women vs 39% of men say social media inspires their
recipe finding; Gen Z is "newer to cooking at home than older generations". **Take:** the core
user skews female and is a less experienced cook; the draft should supply what the video assumes
("medium heat", "until golden"), not just transcribe.

**A3. Attest, "Gen Z food trends"** (1 Oct 2024, page updated since; 1,000 US Gen Z 18–27)
<https://www.askattest.com/blog/research/gen-z-food-trends-2.md>
73% use social platforms to explore food; where they look: TikTok 53% (63% of women), Instagram
40%, YouTube 39% (46% of men vs 33% of women). **Take:** Instagram is the second source even
for Gen Z, YouTube skews male; Pinch's three platforms are right, and TikTok is the gap.

**A4. ButcherBox / Pollfish, "Kitchen intimidation no more"** (1 Mar 2023; 2,000 US adults who
consume food content on social media)
<https://prnewswire.com/news-releases/kitchen-intimidation-no-more--new-report-reveals-more-than-half-of-americans-credit-social-media-for-their-kitchen-confidence-301755669.html>
88% use social media for food inspiration; 52% rely on it weekly when planning meals; 31%
"almost always" make viral recipes more than once; >70% find inspiration via the algorithm and
44% are not loyal to specific creators; nearly 40% of Gen X and 20% of Boomers use TikTok for
recipe inspiration. **Take:** the behaviour is weekly meal planning, not novelty; recipes get
re-made, so "cooked" and notes have a life; people won't remember whose video it was, so the
saved thing must be searchable by what it is.

**A5. Olive magazine / Censuswide, "What we can learn from Gen Z"** (28 Sep 2023; UK, 1,016
Gen Z 16–26) <https://www.olivemagazine.com/guides/what-we-can-learn-from-gen-z>
68% get food inspiration from TikTok (72% of women), 54% YouTube, 49% Instagram; 61% make
meals because they look good on social media; 62% trust recipes from social media; **40% trust
generative-AI recipes** (51% of men, 37% of women). **Take:** the review step is a trust
feature, not friction; show the source next to the draft and make a fix one tap.

**A6. Greenpark via Food & Drink Technology** (1 May 2025; agency research, sample unstated —
weaker) <https://www.foodanddrinktechnology.com/news/58635/one-third-of-consumers-purchase-food-directly-through-social-media/>
People search for recipes ~7×/month (Gen Z 10, Millennials 12); 66% have bought an ingredient
featured in an online recipe; a typical person cooks 5 days a week. **Take:** Millennials are
the heavier "cook from it later" users; the shopping moment sits between saving and cooking.

**A7. Strzelecki et al., Int. J. Consumer Studies (DOI 10.1111/ijcs.70184), via Tubefilter and
Wiley** (Jan–Feb 2026; 406 active TikTok users)
<https://www.tubefilter.com/2026/02/25/tiktok-food-trends-study-foodtok-diet/amp/>,
<https://newsroom.wiley.com/press-releases/press-release-details/2026/How-does-TikTok-shape-young-peoples-dietary-preferences/default.aspx>
97% have followed a recipe found on TikTok; 73% follow culinary creators; "the key driver is the
way the dish is shown and explained". **Take:** nobody needs convincing to cook from video; the
job is making the second and tenth time less painful.

**A8. Celisia Stanton, "My Battle Against Recipe Hoarding"** (Substack, 25 Oct 2024)
<https://sincerelycelisia.substack.com/p/my-battle-against-recipe-hoarding>
A "recipe graveyard" is "anywhere good intentions of cooking go to die": "an unsorted saved
folder on Instagram, full of cooking reels", the TikTok liked tab, a "deeply unorganized" Notes
list of links. Why uncooked: "the few clicks it would take to order Doordash are simply too
tempting". **Take:** at 7 pm the competitor is delivery; opening a recipe and starting must feel
shorter than ordering. The Notes-app-of-links is the pattern to replace.

**A9. Plan to Eat, "What's the best app for recipe hoarders?"** (22 May 2026; vendor blog)
<https://www.plantoeat.com/blog/2026/05/whats-the-best-app-for-recipe-hoarders/>
A customer with "nearly 6,000 recipes saved" and uncooked; recipes scattered across Pinterest,
bookmarks, "200 tabs on your phone", screenshots, three social apps; finding one on a phone can
be "impossible". **Take:** saving is free, retrieval is the broken half; design for find-again.

**A10. r/digitalminimalism, "How are you guys finding recipes?"** (≈ Oct 2025; read through an
unofficial mirror, reddit.com refused the crawler — anecdotal)
<https://reddit.sentinel-team.org/posts/1syey7w/snapshots/2026-04-29T10%3A15%3A09.860593Z>
Top comment: "99% of the recipes I have saved on social media I've never cooked or even looked
at again." Another avoids short-form recipes because they "are not well explained and a lot of
things can get lost" and goes to the creator's blog for the written version. **Take:** people
already hand-build Pinch's workflow (video → find the written version); the draft must make
visible what the video didn't say.

**A11. Product Hunt, Recip** (≈ Aug 2026; maker's post)
<https://www.producthunt.com/p/recip-recipe-keeper-and-meal-planner/recip-recipe-keeper-and-meal-planner>
"My saved folder on Instagram was a graveyard." "Hundreds of cooking reels, zero cooked." A
caption promising the recipe "in comments" usually doesn't have it. **Take:** "recipe in
comments" is a specific dead end; when the caption has nothing, say so rather than produce a
thin draft.

**A12. Straight Arrow News, "Social media recipes are replacing cookbooks"** (2 Apr 2025)
<https://san.com/cc/social-media-recipes-are-replacing-cookbooks-changing-the-way-we-shop/>
"I get most, if not all, of my recipes from TikTok"; videos skip details like "heavy cream or
Greek yogurt?"; 89% rely on digital recipes (Chicory). **Take:** ambiguity is the model's main
job; show an uncertain ingredient as something to confirm, not as confident text.

**A13. ReciMe, Apple App Store** (4.8★, ~330K ratings; Plus $6.99–$59.99)
<https://apps.apple.com/us/app/recime-recipe-saver-meal-plan/id1593779280>
Praised (dated reviews, 2024–2025): keeping the source link, "audio-based extraction when the
recipe text isn't in the post", extracting "from a video with no caption", serving adjustments,
the screen staying unlocked, steps one at a time. Complained: tags not saving, a paste button
missing, paying by accident. **Take:** source link kept, screen awake, one step at a time and
scaling are table stakes for the recipe screen.

**A14. ReciMe reviews on JustUseApp** (scraped, undated, small sample)
<https://justuseapp.com/en/app/1593779280/recime-recipe-saver-meal-plan/reviews>
Fails to itemise ingredients "75% of the time" for one user; imports "take a long time and get
stuck loading"; when nothing generates "the link is still saved for later"; "my screen stays on
while I cook"; free tier ends after 4–5 imports. **Take:** honest progress with a visible
retry, always keep the link even when extraction fails, "screen stays on" is the most-praised
cook feature.

**A15. Samsung Food (ex-Whisk) reviews on JustUseApp** (undated)
<https://justuseapp.com/en/app/1133637674/samsung-food-meal-planner/reviews>
"6 - 8 Tbps. of cold water" silently rewritten to "6 tablespoons water" on save; scaled
servings don't reach the shopping list; iPad users ask for landscape "so I could use easier in
kitchen when cooking". **Take:** never silently normalise a quantity; keep the original text
visible in review; support landscape and tablets in the cook view.

**A16. Samsung Food Chrome extension reviews** (3.2★/36, Nov 2023–Oct 2026)
<https://chromewebstore.google.com/detail/samsung-food/gfoijmnbedaipllfimaogeepohalbgka/reviews>
Repeated "spinning wheel forever"/"permanent loading circle"; a collection picker that shows 10
of ~30 collections. **Take:** an endless spinner with no error is the most-reported failure
across two apps; pickers need search once lists grow.

**A17. Digital Trends, "Finding recipes on TikTok and YouTube is my new favorite way to cook"**
(18 Jun 2022) <https://www.digitaltrends.com/?p=3107237>
With a 10-minute YouTube video: "the next step of the video would pass too quickly, causing me
to miss it… I would have to stop what I was doing, wash off my hands, and rewind"; "long and
maddening". A one-minute TikTok was "replayable" but "it does get old listening to the same
TikTok again and again" and it "would skip over steps widely known to bakers". **Take:** the
wet-hands rewind loop is why a text step list beats the video at the stove; keep the clip one
tap away for the moment a step is unclear.

**A18. Washington Post (Emily Heil) via NZ Herald, "How TikTok has changed the way we cook"**
(1 Feb 2025) <https://www.nzherald.co.nz/viva/culture/how-tiktok-home-to-goofy-dances-dubious-health-advice-has-changed-the-way-we-cook/HKQ4DDL4CZDQJLACTBEDIUGSH4>
Cooking "doesn't have to be so freaking intimidating"; recipes are "streamlined, with pared-down
instructions and few ingredients", simplified for "the most distracted of distractible
audiences". **Take:** keep the casual tone and short steps; add the precision the format strips.

**A19. Marian Bull, "What makes a TikTok recipe?"** (28 Jul 2022)
<https://marianbull.substack.com/p/what-makes-a-tiktok-recipe>
There is "not really a great methodology" for keeping track; one cook "often screenshots the
ingredient list and rewatches the video until she understands the basic method"; a given
creator's recipe gets cooked "once every four to six weeks". **Take:** screenshot-and-rewatch is
the manual baseline Pinch replaces; the realistic cadence is weekly-to-monthly, so retention is
about find-again, not daily use.

**A20. Vice, "TikTok is the food platform of the people"** (28 May 2020)
<https://www.vice.com/en/article/tiktok-is-the-food-platform-of-the-people/>
"Only so much can be explained in one minute or shown in a meaningful way through un-narrated
clips." **Take:** un-narrated reels mean the caption and on-screen text matter as much as audio.

**A21. Stasht, "How to organize saved Instagram Reels"** (12 Jun 2026; vendor blog)
<https://stasht.app/blog/how-to-organize-saved-instagram-reels>
Instagram Saved has no sort or filter and limited search; a save breaks if the post is deleted;
DM-to-self is "great inbox, terrible archive"; "any system that depends on you doing manual
work at save time will decay". **Take:** capture must be one action with no decisions; store the
recipe, not just the link, because the source can vanish.

**Not readable this pass (nothing cited from them):** appshunter.io and WhistleOut ReciMe reviews
(403); the HelloFresh Gen Z survey (paywalled; its "70% use short-form content to find recipes"
is therefore unverified); every reddit.com URL (blocked); Nutrola's "73% save weekly, 12% ever
cooked" (vendor blog citing an IFIC survey with no link — not used).

### B. Similar products

Read from vendor sites, App Store listings, help centres and independent reviews (MacStories,
TapSmart, TechCrunch, KTLA). Store descriptions are vendor copy and are treated as claims.

**B1. ReciMe** — <https://recime.app>, <https://apps.apple.com/us/app/id1593779280>,
<https://recime.app/help/en/articles/11596425-import-from-instagram>,
<https://recime.app/help/en/articles/11661452-import-from-tiktok>
iOS/Android/web/Chrome; free is "5 recipe imports per week", Plus is a subscription; 4.8★,
~330K ratings. Capture is the share sheet (Share → More → ReciMe, 3 taps and a scroll) or
"Import by Pasting Text"; the help docs describe a **fallback ladder** — "works best when the
recipe is written out in the caption", then "the video's audio", then the original recipe
website — that the UI never shows. No progress or queue is described anywhere; the recipe
"will be imported directly into ReciMe". Cook mode keeps "the screen unlocked" and "walks
through recipes step by step"; servings scale; nutrition is calculated. No review before save;
a reviewer is "locked out of editing text" (L4990, 8 Sep 2024). **Take:** say which source the
draft came from — the ladder made visible.

**B2. Samsung Food (ex-Whisk)** — <https://apps.apple.com/us/app/id1133637674>,
<https://www.wrdw.com/2025/07/07/what-tech-app-day-samsung-food/>
Share sheet capture, "even if the recipe is not written out"; step-by-step "Smart Cooking Mode"
is **paywalled** in Food+ ($6.99/mo); folders with example names ("Summer Grill Favorites",
"Quick Weeknight Meals"); historically linked out for directions — "you have to leave the app
for the directions which is a waste of time" (review, 21 Aug 2023). **Take:** example folder
names as empty-state copy; never paywall or outsource the cook view.

**B3. Flavorish** — <https://www.flavorish.ai>, <https://apps.apple.com/us/app/id6478546136>,
<https://www.flavorish.ai/blog/save-recipes-from-instagram-tiktok-youtube-facebook>
Share sheet or paste into "Save recipe from social media"; when the caption lacks the recipe it
"may generate a suggested recipe with AI" and the blog says "always review AI-generated recipes
before cooking" — the UI does not mark them. A reviewer asks for "moving the save button to the
top or floating" (Lolly418, Oct 2025). Multi-recipe cook mode, screen "stays awake hands-free",
light and dark mode. **Take:** a sticky Save; label a thin draft as a suggestion.

**B4. Crouton** — <https://crouton.app>,
<https://www.macstories.net/reviews/crouton-review-an-elegant-modern-recipe-manager-and-cooking-aid/>,
<https://www.tapsmart.com/apps/review-crouton/>
Apple only, one-time $24.99. Detects a recipe URL on the clipboard and "a pop-up offers to
import it"; the import pop-up lets you "edit any details" before saving. Cook mode: "steps
appear one at a time", tap an ingredient inside a step to see its quantity and check it off
"without leaving the step", detected times become one-tap timers, iPad shows ingredients left
and steps right, wink to advance. "Modern and playful, with rounded rectangles"; auto dark mode.
Weak on "multi-component recipes". **Take:** ingredients inline in the step — the best single
cook-mode pattern found — and clipboard detection as a capture path.

**B5. Mela** — <https://mela.recipes>, <https://apps.apple.com/us/app/mela-recipe-manager/id1548466041>,
<https://www.macstories.net/reviews/mela-1-6-adds-web-search-engine-and-recipe-import-from-youtube-instagram-and-tiktok-videos/>
Apple only, one-time $6.99; MacStories "Best Design 2021"; "bright yellow accent color and
clear, carefully laid-out text". The share extension "shows a preview (image, ingredients,
instructions) so you can verify parsing before saving"; video import reads "the video's
description, not its visuals or audio" (about 7 of 10 worked for the reviewer). Under the title:
the source link, servings, prep time, then yellow Cook / Groceries / Scale buttons. Cook mode
full screen, larger font, other steps dimmed, tap an ingredient to check it off, timers,
"Disable Auto-Lock" setting. Shelves: Favorites, Want to Cook, Most Recent. **Take:**
preview-then-save as the recipe page itself; Want to Cook as a first-class shelf; one accent
used with confidence.

**B6. Paprika** — <https://apps.apple.com/us/app/paprika-recipe-manager-3/id1303222868>,
<https://grantourismotravels.com/paprika-recipe-manager-3-review/>
Cross-platform, one-time per platform, 4.9★/54K. "Cross off ingredients and highlight the
current step"; "timer detection, where you tap to start a timer"; "keep the screen on while
cooking"; landscape puts ingredients beside directions; scaling 1/8×–8×. "Paprika makes me
want to add recipes – and makes me want to cook them." **Take:** tappable timers inside the
step text and a highlighted current step are what reviewers expect.

**B7. Recipe Keeper** — <https://recipekeeperonline.com>, <https://apps.apple.com/gb/app/recipe-keeper/id974683711>
"The screen lock is disabled while viewing recipes"; filters by category, rating, cook time and
nutrition; "check off ingredients while cooking and highlight the current direction". **Take:**
cook time as a filter.

**B8. Pestle** — <https://pestlechef.app>,
<https://techcrunch.com/2024/07/08/pestles-app-can-now-save-recipes-from-reels-using-on-device-ai>,
<https://www.producthunt.com/products/pestle>
Reads the **caption only**, on device, "in about one-tenth of a second"; a reel that can't be
parsed becomes a **bookmark** rather than a wrong draft; timers ring through mute; "Cook
Together" over SharePlay. "Almost 100% of the recipes I try to save will not save" (review,
3 Aug 2022). **Take:** never lose the link — a failed extraction is still a saved thing.

**B9. Umami** — <https://www.umami.recipes>, <https://digital-release.ktla.com/?p=3557636>
"Specific import options for inputting a TikTok or Instagram URL"; "Start Cooking" opens an
ingredient checklist with step-by-step instructions; export to PDF/Markdown/JSON. KTLA:
importing "can sometimes be a little wonky". **Take:** paste-a-URL as a first-class entry on a
web app; export.

**B10. Cooked (cooked.wiki)** — <https://cooked.wiki>, <https://help.cooked.wiki/getting-started/cook-saved-recipe/>,
<https://cooked.wiki/pricing>
**A web app with a full cook mode:** "Start Cooking" → one step at a time, swipe or tap between
steps, "Screen lock… prevents your device from going to sleep while cooking", a timer icon per
step, servings changed inside cook mode, voice "Next"/"Previous", exit by button or swipe
down. Free for unlimited saves from websites, Instagram, TikTok and YouTube; the clipper shows
the extracted fields to review before "Save Recipe". **Take:** proof that Pinch's stack can
carry a real cook mode — the closest platform analogue.

**B11. Saffron** — <https://www.mysaffronapp.com> — cookbooks with sections; search by title,
ingredient and author. **Take:** the creator as an author facet.

**B12. CookBook** — <https://www.cookbookmanager.com>,
<https://apps.apple.com/us/app/cookbook-the-recipe-manager/id1073341917>
"Review the imported ingredients and steps, then fill in anything missing"; a "last-cooked date";
timers and ingredients "displayed alongside the steps"; text read aloud; user-set colours and
text size. **Take:** review framed as completing what's missing; last cooked on the card.

**B13. Copy Me That** — <https://apps.apple.com/us/app/copy-me-that-recipe-manager/id956800243>
Saves "full recipe copies, not just links" from Instagram and Facebook; the screen stays awake;
default categories can't be deleted (complaint). **Take:** categories the user owns.

**B14. Deglaze** — <https://www.deglaze.app>, <https://www.deglaze.app/how-to/save-recipes-from-instagram>
Share sheet (4 taps) or paste; "saves your Instagram recipe in under a second and processes the
video in the background" — **the card appears at once and fills in**; reads caption, audio,
on-screen text and frames (≤ 10 min); "very fast cuts and stylized fonts can cause errors";
"Report a Recipe Issue" sends the source video back. **Take:** optimistic card plus background
fill; a one-tap report that attaches the source.

**B15. Platform natives** — TikTok × Whisk "See full recipe" pilot (2021,
<https://techcrunch.com/2021/02/11/tiktok-partners-with-whisk-to-pilot-a-recipe-saving-feature-on-food-videos/>);
Instagram Collections (no sort, no search); Pinterest's "Make this recipe" experiment (2026,
<https://community.pinterest.biz/t/what-is-this-make-this-recipe-button-on-mobile/48800.md>).
**Take:** the platforms themselves don't solve find-again; Pinterest is experimenting with
AI-rewritten steps, so "AI-made recipe, check it" is becoming a familiar idea.

**Synthesis (B).** Nearly every good product has: share-sheet capture in 3–4 taps with no
progress shown ("it just appears"), paste-a-link as the second path, a cook mode with one
highlighted step, larger type, wake lock, timers from the text, ingredient check-off and
scaling, and folders + tags + ingredient search with a Favourites / Want-to-cook shelf. They
differ on what the AI reads (caption only → caption + audio → the video itself) and on review
before save (Mela, Cooked, CookBook) vs land-in-library (ReciMe, Flavorish, Pestle, Deglaze).
**The gap:** nobody shows the import honestly (where a field came from, what's uncertain), the
failure state is the weakest screen in the category (reviews of four apps complain of imports
that fail or "get stuck loading"), and **nobody offers a way back to the video** from a step;
web cook modes are nearly unoccupied (Cooked is the exception).

**Not readable this pass:** samsungfood.com, whistleout.com, appshunter.io (403); copymethat.com
(503); theverge.com (blocked); the Google Play pages (truncated).

### C. Analogues from other domains, and platform patterns

**C1. Raindrop.io extension help** <https://help.raindrop.io/browser-extension>
One-click save is an opt-in setting; saved items go to "Unsorted (or the last used collection)";
a badge can show "a page that's already in your bookmarks". Users ask for always-Unsorted
(<https://better.raindrop.io/feature-requests/p/save-always-to-unsorted-as-default>). **Take:**
a pinch lands in one place with no choices; categorise later; detect "already in your library".

**C2. Instapaper 6.1 share extension (MacStories)** <https://www.macstories.net/ios/instapaper-6-1-brings-redesigned-share-extension/>
Dropped the modal for a top banner that "lets you see more content underneath"; move to a folder
*after* saving; an unread count badge. **Take:** confirmation is a non-blocking banner; nothing
in the save path asks a question; "3 to review" is a proven cue.

**C3. Readwise Reader, parsing FAQ** <https://docs.readwise.io/reader/docs/faqs/parsing>
"It's still not possible to parse the open web 100% correct 100% of the time"; parsing is
partial when an app passes only "the naked URL"; Reader never re-parses, so a fix means
delete-and-re-save; re-saving a URL moves it to the top with a green dot. **Take:** model a draft
as complete / partial / failed and make "try again" a button that keeps the cook's edits.

**C4. Pocket's shutdown (9to5Mac)** <https://9to5mac.com/2025/05/22/mozilla-announces-shutdown-of-pocket/>
Shut down 8 Jul 2025, data deleted after exports closed. **Take:** don't cite Pocket as a live
reference; offer export early, because read-later users have been burned.

**C5. Gmail Undo Send** <https://blog.google/products-and-platforms/products/gmail/how-to-unsend-email-gmail/>
"Message sent" with "Undo" beside it, five seconds by default. **Take:** "Pinched. Making your
recipe… Undo" in a toast; Undo deletes the import before the worker finishes.

**C6. Google Photos backup status** <https://support.google.com/photos/answer/6193313?hl=en>
A global status ("Backing up photos", "Backup complete") plus per-item icons: uploading, in
queue, permanent failure; progress "measured by how many items remain", a check shown "for 3
seconds". **Take:** a global strip counting items left (no fake percentage) plus a per-item
state; failed is a distinct state with a reason; "retry all failed".

**C7. Expensify SmartScan troubleshooting** <https://help.expensify.com/articles/new-expensify/reports-and-expenses/Troubleshoot-SmartScan-Issues>
"Usually completes within a few seconds, but delays can happen"; fails when it "can't
confidently read the required fields"; the message names them: "Receipt scanning failed —
missing merchant, date, and amount. Enter details manually." **Take:** failure copy that names
what couldn't be found; define a draft's required fields; a result missing them is `partial`.

**C8. Mela, App Store** <https://apps.apple.com/us/app/mela-recipe-manager/id1568924476>
Cook mode uses "a larger font"; timers created and managed inside cook mode ("No need to switch
to another app"); recipes marked "Favorite" or "Want to Cook"; the importer reads "video
descriptions on YouTube, TikTok and Instagram" where they exist. **Take:** a cook route with
large type, timers from the step text, and a Want-to-cook status.

**C9. NYT Cooking "Cook Mode"** <https://apps.apple.com/gb/app/nyt-cooking/id911422904>; WordPress
recipe-plugin convention <https://www.wptasty.com/cook-mode>
A visible "Cook Mode" toggle near the recipe title that keeps the screen awake until it is
switched off or the page is left. **Take:** the switch is the web convention; make its state
visible ("Screen stays on") and say so when the lock is refused.

**C10. Screen Wake Lock API** — MDN <https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API>,
caniuse <https://caniuse.com/wake-lock>, Chrome <https://developer.chrome.com/docs/capabilities/web-apis/wake-lock>
`navigator.wakeLock.request("screen")`, secure context only; released when the document is
hidden, so re-request on `visibilitychange`; may be refused (low battery, power save).
**Baseline 2025 (newly available)**: Chrome 84+, Firefox 126+, Safari 16.4+ including iOS;
96% global usage. The Chrome article's first example is "a recipe app that keeps the screen on
while you bake a cake". No user-gesture rule is documented in these pages; request from the
toggle anyway. **Take:** `useWakeLock()` behind the cook-mode switch; feature-detect; a hint when
unsupported. Test in iOS Safari and as an installed PWA (a WebKit bug about standalone mode is
mentioned in search results and not verified).

**C11. Google Maps voice navigation** <https://support.google.com/gmm/answer/3137767>
Sound tiers Mute / Alerts only / Unmute; one big current instruction, a bottom card for the
rest, a visible "Searching for GPS" degraded state. **Take:** one big current step, a thin "next"
preview, one exit control, visible degraded states; later, "timers only / read aloud" tiers.

**C12. Goodreads shelves** <https://www.goodreads.com/blog/show/1399>
Three default exclusive shelves (Read, Currently Reading, Want to Read) plus free custom
shelves; a date read per book. **Take:** one exclusive status per recipe (to review → want to
cook → cooked) and many non-exclusive tags; "cooked" carries dates.

**C13. Letterboxd Watchlist and Diary** <https://letterboxd.com/welcome/> (site refuses fetches;
from search snippets) Marking watched moves a film off the Watchlist; logging adds a dated
diary entry. **Take:** "I made this" is one cheap tap; a dated note is optional.

**C14. Spotify "Made For You"** <https://newsroom.spotify.com/?p=35014>
A hub of personalised sections and "up to five genre options" as chips at the top. **Take:** a
small library (10–200) is best as a few horizontal sections and 3–5 mood chips, with the full
filter set behind a button, not a facet panel on the page.

**C15. Web Share Target** — MDN <https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target>,
Chrome <https://developer.chrome.com/docs/capabilities/web-apis/web-share-target>, WebKit bug
<https://bugs.webkit.org/show_bug.cgi?id=194593>
Only an **installed** PWA can be a share target; not Baseline. Chrome: Android 76+, desktop
89+; GET params `title`, `text`, `url`, and on Android the URL often arrives in `text` — "verify
incoming data". WebKit 194593 "Add support for Web Share Target API": filed 2019, status NEW,
last comment May 2026: **iOS Safari has no share target.** **Take:** ship `share_target` for
Android after install; on iOS the primary path is a Paste button (plus an optional iOS Shortcut
that opens `/add?url=`).

**C16. Installability (web.dev)** <https://web.dev/articles/install-criteria>
HTTPS; a manifest with name, 192 and 512 px icons, `start_url`, `display`; Chrome prompts after
one tap and 30 s on the site. **Take:** install is a deliberate onboarding step, not a
first-visit surprise.

**C17. Clipboard API** — MDN <https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API>,
<https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/readText>
`readText()` is Baseline (Apr 2024), secure context, needs a user gesture; Chromium asks a
`clipboard-read` permission once; Safari and Firefox show their own one-option "Paste" bubble
instead and support no permission. **Take:** a "Paste" button that calls `readText()` on tap,
never on load or focus; a plain input remains the universal fallback.

**C18. Triton/Omny transcript editor** <https://help.tritondigital.com/docs/edit-and-export-transcription>
Low-confidence words "highlighted in yellow to make them easy to identify, check, and if
needed, correct"; clicking a word plays the audio there. **Take:** yellow for "check this"
fields in review; tapping a step could later seek the reel.

**C19. Grammarly suggestion colours** <https://www.grammarly.com/blog/product/better-writing-with-grammarly/>
Colour per class of suggestion; bulk accept "only works with high-confidence suggestions".
**Take:** two classes in review — red (required and missing) and yellow (uncertain) — and no
"accept all" that swallows the yellows.

**Not readable this pass:** web.dev's web-share-target article (404), caniuse's `share_target`
table, Letterboxd's about pages (403).

## Pass 2 — capture, review, the add/browse split and recall, 2026-11-09

Questions from the user (pass-02.md §1): pinching takes too many steps and confirms nothing;
review is a long form that hides what the model read or doubted; the paste field and the
library need a clear split ("maybe tabs"); every recipe needs a picture to be remembered by.
Products already in pass 1 are not repeated.

### D. Direct products (not in pass 1)

**D1. Honeydew** — <https://apps.apple.com/us/app/honeydew-meal-planner/id6714449541>
4.8★/1.9K; $6.99/mo or $39.99/yr. Imports "YouTube cooking videos and Facebook and Instagram
Reels", screenshots, notes, pasted URL or text; translates "foreign-language recipes into
English" (review, Jun 2025). Complaints: "Don't Use with Recipe Videos" (23 Jul 2025) — "the
ingredients are all wrong, cooking times incorrect"; "BUYER BEWARE!" (4 Sep 2025) — "a download
glitch when saving a second recipe while the first was still downloading" and 100+ trial
recipes lost. Phone only. **Borrow:** a second pinch while the first runs is an ordinary
queued item, never a collision.

**D2. Plan to Eat** — <https://apps.apple.com/au/app/plan-to-eat/id1215348056>,
<https://learn.plantoeat.com/help/app-the-recipe-clipper-extension-for-ios-browsers>,
<https://addons.mozilla.org/en-US/firefox/addon/plan-to-eat-recipe-clipper/reviews>
4.7★/117 (AU), $89.99/yr. Capture is five documented steps ending in "a draft recipe will
import. Tap Save to add the recipe to your Recipe Book": the draft screen is the confirmation.
Complaints: "appears as though it wasn't saved at all… about three tries" (7 Feb 2019); the
Firefox clipper "Works most of the time" (Apr 2025, 3 reviews — weak). Web app + phone app;
release notes: "recipe photos now appear on the planner". **Borrow:** with a 15–60 s wait,
Pinch needs an explicit "saved, working" state that a five-step flow lacks.

**D3. NYT Cooking Recipe Box** — <https://thenewyorktimeshelpcenter.helpjuice.com/19698276311700-Cooking-Recipe-Box>,
<https://ixd.prattsi.org/2025/02/design-critique-nyt-cooking-mobile-app/>
Save is confirmed by the icon's state (the ribbon "is filled in"); everything lands in "All
Saved Recipes"; premade **Favorites** and **Want to Cook**; "+ Filter" under the search box.
Pratt (13 Feb 2025): "Recently Saved" and "Your Folders" stacked "take up much of the screen".
**Borrow:** a state change on the control as the confirmation; one list with filters, not two
stacked blocks.

**D4. Tasty (BuzzFeed)** — <https://apps.apple.com/us/app/tasty-recipes-cooking-videos/id1217456898>
4.9★/433K. Two tabs: Discover vs "'My Recipes' page which serves as your very own mobile
cookbook"; every card a video still. Complaint (Google Play via search snippet — weaker): a
saved recipe is hard to find "without remembering its name". **Borrow:** the two-tab split
works at scale; an image grid still needs the title and a filter to restore recall.

### E. Analogues from other domains

**E1. Shazam** — <https://ixd.prattsi.org/2022/02/design-critique-shazam-iphone-app-version-15-3/>,
<https://www.macstories.net/ios/shazam-8-2-with-spotify-playback-new-home-design/>,
<https://www.macrumors.com/2025/11/05/shazam-app-liquid-glass/>
Capture-first home ("a large central Shazam button", "listening" label, each match "saved
automatically"); since Nov 2025 tabs "Home, Library, and Concerts", with "recently identified
songs… directly on the Home screen". Complaint: songs tagged from Control Center "are not saved
to the Shazams list". **Borrow:** capture and its latest results on one screen, the library
in its own tab; every capture path lands in the same list.

**E2. Things 3** — <https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/>,
<https://culturedcode.com/things/blog/2017/12/mail-to-things/>
"Corralling all your to-dos into one place – Things' Inbox – is the critical first step"; the
Magic Plus button sits lower right; a new item "will just need a name"; Add to Things saves
"in the background". Mac: sidebar with Inbox first. **Borrow:** an inbox of things to process,
with a count, distinct from the organised library; capture asks for one thing.

**E3. Dext (+ Veryfi)** — <https://dext.com/uk/products/prepare>,
<https://faq.veryfi.com/en/articles/5571597-confidence-score-explained>; Dext's Inbox help page
from a search snippet only (404 on fetch)
States "In Processing" (open it "to see what has been pulled out so far"), "To Review" =
"missing some information… you will need to complete before the item can be published",
"Ready"; a corrected field "logs that change as a reported mistake". Vendor: "Anything Dext is
unsure of comes to you first" (vendor copy). Veryfi: per-field scores that "are not absolute
measures of accuracy". **Borrow:** draft states processing → to check (naming what's missing)
→ ready; flag doubt per field, never show a confidence number as accuracy.

**E4. Pinterest, NN/g, and covers for items with no image** — <https://help.pinterest.com/en/article/edit-a-board>,
<https://ixd.prattsi.org/2024/09/design-critique-pinterest-ios-app-2/>,
<https://www.nngroup.com/articles/picture-superiority-effect/>, <https://help.raindrop.io/bookmarks>,
<https://dev.to/wchr/how-does-dev-to-give-rich-link-image-previews-of-articles-with-no-cover-images-544c>
Image-first grids; Pratt (18 Sep 2024): Save hidden among share buttons "discourages them from
pressing 'Save'". NN/g: pictures beat words only when "literal", "distinct from neighboring
ones" and paired with "text labels". Raindrop grabs the thumbnail automatically; dev.to
generates a cover "with the title" when none exists. **Borrow:** the post's picture with the
title always under it; with no picture, a generated cover that is literal (the dish), not a
grey placeholder.

### Synthesis

Capture-first products (Shazam, Things, Plan to Eat) confirm a capture by a state change plus
the item appearing in a list right there; Pinch should show the new row at once on the Pinch
screen with a stage, and a toast with Undo. Dext/Veryfi model review honestly: processing / to
check (names what's missing) / ready, doubt flagged per field, the source beside the fields.
Products at scale split add from browse into two tabs (Tasty, Shazam 2025) with the add action
always one tap away; on desktop the same becomes header tabs or a sidebar. Every library is
image-first, but Tasty's reviews show images alone don't restore recall: literal + distinct +
labelled (NN/g).

### Adopt / avoid

- **Adopt:** two tabs, Recipes and Pinch; the queue lives on Pinch with counts; the row
  appears the instant a link is pasted; review with the post beside the draft and per-field
  marks; a picture or a literal emoji cover on every card, the title always under it.
- **Avoid:** two stacked blocks on the library (NYT); confirmation that depends on a route
  change; a second import colliding with the first (Honeydew); a capture path that doesn't land
  in the one list (Shazam); confidence numbers presented as accuracy.

**Not readable this pass:** help.dext.com Inbox articles (404; snippet only); quench.me and
kimola Tasty pages (403/410); TrustRadius and G2 Dext reviews (403); help.pinterest.com save
pins (404); Business Insider Pinterest how-to (redirect); appshunter.io (403).
