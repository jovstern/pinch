// Every word the interface says, in English (design §16.3, D39): one object, keys grouped by
// area. In the entry: English is the default and the fallback. Hebrew (he.ts) has the same keys,
// which tsc checks. A plural is written whole in each form (_one, _other), and i18next picks one
// by count. The strings move here area by area (M10's slices); the rest are still in the
// components.
export const en = {
  // The app's frame: the logo, the tabs, Write a recipe and the avatar's menu (Header, UserMenu).
  header: {
    home: "Pinch, Add recipe",
    nav: "Main",
    addRecipe: "Add recipe",
    // After the tab's count, for a screen reader: "Add recipe 2 ready to review".
    readyToReview: "ready to review",
    myRecipes: "My recipes",
    // After My recipes' count, for a screen reader: "My recipes 12 recipes".
    recipeCount_one: "recipe",
    recipeCount_other: "recipes",
    writeRecipe: "Write a recipe",
    account: "Your account",
    language: "Language",
    logOut: "Log out",
  },
  // The frame's own pages: an address with nothing at it, and a page that failed to render
  // (NotFoundPage, ErrorBoundary).
  frame: {
    notFound: "Page not found",
    nothingHere: "There is nothing at this address.",
    backToRecipes: "Back to My recipes",
    didntLoad: "This page didn't load",
    checkAndReload: "Check your connection, then reload the page.",
  },
  // Log in, Sign up and the session's error (SessionError), with what a failed submit says
  // (submitError). A field's own messages are the shared schemas' (validation, design §16.7).
  auth: {
    logIn: "Log in",
    loggingIn: "Logging in…",
    newToPinch: "New to Pinch?",
    signUp: "Sign up",
    signingUp: "Signing up…",
    haveAccount: "Already have an account?",
    name: "Name",
    email: "Email",
    password: "Password",
    passwordHint: "At least 8 characters.",
    // Between the form's button and Google's.
    or: "or",
    continueWithGoogle: "Continue with Google",
    googleFailed: "Couldn't sign in with Google. Try again.",
    noMatch: "That email and password don't match.",
    // Followed by a link, Log in.
    emailTaken: "An account already uses this email.",
    tooManyTries: "Too many tries. Wait a minute and try again.",
    unreachable: "We couldn't reach Pinch. Try again.",
    somethingWrong: "Something went wrong. Try again.",
    // SessionGate's page, when who's signed in can't be asked.
    cantReach: "We couldn't reach Pinch",
    checkAndTryAgain: "Check your connection, then try again.",
    tryAgain: "Try again",
    trying: "Trying…",
  },
  // Add recipe, at /: the paste box, the screenshots and the queue under them (ImportPage,
  // ImportForm, ScreenshotsUpload, ImportList, ImportActions). Its toasts stay English (D46): they
  // are in lib/toasts.tsx and useImportToasts, not here.
  imports: {
    // The paste box's label, for a screen reader, and its hint (the placeholder isn't read).
    pasteLabel: "Pinch a recipe from a reel",
    pasteHint: "Paste a YouTube short, a Facebook or Instagram reel, or a recipe as text",
    // Short: it's the page's LCP with an empty queue (LazyImportForm draws it before the box).
    pastePlaceholder: "Paste a video or a recipe",
    pinchIt: "Pinch it",
    sending: "Sending…",
    couldntSend: "We couldn't send this. Try again.",
    // The day's caps (D22, D30), as the API's 429 says them (shared's dailyLimitMessage and
    // globalLimitMessage, which the toasts show), chosen by its code (design §16.7).
    dailyLimit: "You've sent {{cap}} imports today. Try again tomorrow.",
    globalLimit: "Pinch has read all it can for today. Try again tomorrow.",
    addScreenshots: "Or add screenshots",
    screenshotsHint: "Up to {{max}} screenshots of the recipe, when its link and text won't do.",
    couldntSendThese: "We couldn't send these. Try again.",
    writeItYourself: "Or write it yourself",
    couldntLoad: "We couldn't load your imports",
    // The queue's heading, "2 ready · 1 in progress · 1 failed", each part left out when none.
    ready_one: "{{count}} ready",
    ready_other: "{{count}} ready",
    inProgress_one: "{{count}} in progress",
    inProgress_other: "{{count}} in progress",
    failed_one: "{{count}} failed",
    failed_other: "{{count}} failed",
    // A card's title until its draft has one: what it was made from.
    platformLink: "{{platform}} link",
    pastedText: "Pasted text",
    screenshots: "Screenshots",
    images_one: "1 image",
    images_other: "{{count}} images",
    // A card's status: waiting → fetching → analyzing → ready to review, or why it failed.
    stuck: "Stuck: nothing has worked on this for a while. Dismiss it and paste it again later.",
    waiting: "Waiting to start…",
    retryingSoon: "That didn't work. Trying again soon…",
    fetching: "Fetching the video…",
    analyzing: "Reading the recipe…",
    working: "Working on it…",
    readyToReview: "Ready to review",
    thingsToLookAt_one: "1 thing to look at",
    thingsToLookAt_other: "{{count}} things to look at",
    didntWork: "That didn't work.",
    // The worker's reasons, by their English (server/src/worker: NOT_A_RECIPE, TOO_LONG,
    // FAILED_MESSAGE), which the import keeps; one it doesn't know is shown as it came (§16.7).
    reasons: {
      notARecipe: "This doesn't look like a recipe.",
      tooLong: "This video is over 5 minutes. Pinch reads shorter ones.",
      couldntTurn: "We couldn't turn this into a recipe.",
    },
    // A card's actions.
    review: "Review",
    cooking: "Cooking…",
    dismiss: "Dismiss",
    dismissing: "Dismissing…",
    retry: "Retry",
    retrying: "Retrying…",
    couldntRetry: "It couldn't be retried. Try again.",
  },
  // My recipes, at /recipes (RecipeListPage, ListFilters, TagChips, RecipeCard). Its page title
  // and heading are the header's My recipes.
  recipes: {
    skipFilters: "Skip the filters",
    // The search box's name, for a screen reader, and what it shows while empty.
    searchLabel: "Search your recipes",
    searchPlaceholder: "Search recipes",
    commonTags: "Common tags",
    // An applied filter's ✕, beside the grid: "Remove vegetarian".
    removeFilter: "Remove {{label}}",
    clearAll: "Clear all",
    loading: "Loading your recipes…",
    couldntLoad: "We couldn't load your recipes",
    // How many a search or the filters left (a page at a time; a search answers its best 50).
    noneMatch: "No recipes match.",
    moreThan: "More than {{count}} recipes match.",
    bestMatches: "The {{count}} best matches.",
    matches_one: "1 recipe matches.",
    matches_other: "{{count}} recipes match.",
    // Nothing matched: what to clear. {{q}} is what was searched, in its own <bdi> (§16.5).
    noMatch: "No recipes match",
    clearSearch: "Clear search",
    clearFilters: "Clear filters",
    searchAll: "Search all recipes for “{{q}}”",
    // Before the first recipe.
    noRecipesYet: "No recipes yet",
    pinchOrWrite: "Pinch one from a reel, or write your own.",
    pinchRecipe: "Pinch a recipe",
    couldntLoadMore: "We couldn't load more recipes. Press Show more to try again.",
    showMore: "Show more",
    loadingMore: "Loading…",
    // A card's line under its title: "10 min · 2 ingredients" (I8 formats the numbers, §16.3).
    minutes: "{{minutes}} min",
    ingredients_one: "1 ingredient",
    ingredients_other: "{{count}} ingredients",
  },
  // My recipes' Filters: the panel from 1024 px, the sheet below, and Sort (FiltersPanel,
  // FiltersSheet, FiltersButton, FilterChoices, filterLabels). The tags' names are tags'.
  filters: {
    filters: "Filters",
    // After the Filters button's count, for a screen reader: "Filters 2 applied".
    applied: "applied",
    clear: "Clear",
    sort: "Sort",
    // Sort's choices: the API's own order first (Newest, or Best match while searching).
    newest: "Newest",
    quickest: "Quickest",
    az: "A–Z",
    bestMatch: "Best match",
    time: "Time",
    anyTime: "Any",
    upTo15: "15 min or less",
    upTo30: "30 min or less",
    upTo60: "1 hour or less",
    source: "Source",
    writtenByMe: "Written by me",
    byTags: "Filter by tags",
    // The sheet's button, which closes it: how many are left, as the page's count says it.
    showRecipes: "Show recipes",
    showMore: "Show {{count}}+ recipes",
    showBest: "Show the {{count}} best",
    show_one: "Show 1 recipe",
    show_other: "Show {{count}} recipes",
  },
  // The tags (design §7, D10): stored and in the address by their code ("cuisine:middle-eastern"),
  // named on screen here, by facet and value (tagLabels). In English, the value in words.
  tags: {
    facets: {
      cuisine: "Cuisine",
      meal: "Meal",
      diet: "Diet",
      flavor: "Flavor",
      fit: "Good for",
    },
    cuisine: {
      italian: "italian",
      asian: "asian",
      "middle-eastern": "middle eastern",
      mexican: "mexican",
      american: "american",
      french: "french",
      indian: "indian",
      mediterranean: "mediterranean",
      other: "other",
    },
    meal: {
      breakfast: "breakfast",
      lunch: "lunch",
      dinner: "dinner",
      snack: "snack",
      dessert: "dessert",
      drink: "drink",
    },
    diet: {
      vegetarian: "vegetarian",
      vegan: "vegan",
      "gluten-free": "gluten free",
      "dairy-free": "dairy free",
      "kosher-dairy": "kosher dairy",
      "kosher-meat": "kosher meat",
      parve: "parve",
    },
    flavor: {
      sweet: "sweet",
      savory: "savory",
      spicy: "spicy",
      sour: "sour",
      smoky: "smoky",
      fresh: "fresh",
    },
    fit: {
      quick: "quick",
      weeknight: "weeknight",
      "meal-prep": "meal prep",
      party: "party",
      kids: "kids",
      healthy: "healthy",
      comfort: "comfort",
    },
  },
  // A recipe's page, at /recipes/:id: its subtitle, sections, ⋯ menu, Delete's question, and
  // while it loads or if it doesn't (RecipePage, RecipeSource, RecipeMenu, DeleteRecipeDialog,
  // RecipeLoadError, RecipeSkeleton). Its title is the recipe's own.
  recipe: {
    loading: "Loading the recipe…",
    notLoaded: "Recipe not loaded",
    couldntLoad: "We couldn't load this recipe",
    // Where it came from, first in the subtitle (also in cook mode). A post's site is its name.
    writtenByYou: "Written by you",
    fromText: "From pasted text",
    fromScreenshots: "From screenshots",
    opensInNewTab: "(opens in a new tab)",
    // "Serves 4 · Prep 10 min · Cook 25 min" (I8 formats the numbers, §16.3).
    serves_one: "Serves 1",
    serves_other: "Serves {{count}}",
    prep: "Prep {{minutes}} min",
    cookTime: "Cook {{minutes}} min",
    // "≈ 520 kcal · 18 g protein · 92 g carbs · 8 g fat per serving (estimate)": Gemini's guess.
    calories: "≈ {{amount}} kcal",
    protein: "{{amount}} g protein",
    carbs: "{{amount}} g carbs",
    fat: "{{amount}} g fat",
    perServing: "per serving (estimate)",
    tags: "Tags",
    cook: "Cook",
    ingredients: "Ingredients",
    steps: "Steps",
    comments: "Comments",
    commentsSoon: "Coming soon: notes from whoever you share this recipe with.",
    // ⋯ and its menu.
    moreActions: "More actions",
    edit: "Edit",
    shareSoon: "Share · coming soon",
    delete: "Delete…",
    // Delete's question. {{title}} is the recipe's, in its own <bdi> (§16.5).
    deleteQuestion: "Delete this recipe?",
    willBeDeleted: "“{{title}}” will be deleted from My recipes.",
    couldntDelete: "It couldn't be deleted. Try again.",
    keepIt: "Keep it",
    deleteIt: "Delete",
    deleting: "Deleting…",
  },
  // The shared components' own words (components/ui): a sheet's ✕, a breadcrumb's landmark.
  ui: {
    close: "Close",
    breadcrumb: "Breadcrumb",
  },
} as const;
