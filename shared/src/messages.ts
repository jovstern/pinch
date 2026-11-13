// What the server says that the user reads, in English, each by a name (design §16.7, D44): the
// schemas' field messages, which the client's own check and the API's 400 fields both show, and
// the worker's reasons for a failed import, which it keeps on the import. The API, the database
// and the server's tests keep the English; the client finds a message's name here and says it in
// the page's language (client/src/locales: en.ts's validation is this object, he.ts translates
// each). Each text once: the client finds the name by it.
export const messages = {
  // Accounts (auth.ts).
  emailRequired: "Enter your email.",
  emailInvalid: "Enter a valid email.",
  emailTooLong: "Keep the email under 254 characters.",
  passwordChoose: "Choose a password.",
  passwordTooShort: "Use at least 8 characters.",
  passwordTooLong: "Keep the password under 200 characters.",
  passwordRequired: "Enter your password.",
  nameRequired: "Enter your name.",
  nameTooLong: "Keep the name under 100 characters.",
  // A recipe (recipe.ts, tags.ts).
  titleRequired: "Give the recipe a title.",
  titleTooLong: "Keep the title under 200 characters.",
  descriptionTooLong: "Keep the description under 2000 characters.",
  ingredientsRequired: "Add at least one ingredient.",
  tooManyIngredients: "A recipe can have up to 100 ingredients.",
  ingredientNameRequired: "Name the ingredient.",
  // An ingredient's name, and its amount, unit and note.
  under200: "Keep it under 200 characters.",
  under50: "Keep it under 50 characters.",
  stepEmpty: "A step can't be empty.",
  stepTooLong: "Keep each step under 2000 characters.",
  stepsRequired: "Add at least one step.",
  tooManySteps: "A recipe can have up to 100 steps.",
  wholeNumber: "Enter a whole number.",
  servingsRange: "Servings must be between 1 and 100.",
  prepRange: "Prep time must be between 0 and 1440 minutes.",
  cookRange: "Cook time must be between 0 and 1440 minutes.",
  tooManyTags: "A recipe can have up to 20 tags.",
  tag: "Pick a tag from the list.",
  // My recipes' address (recipe.ts): only in the API's 400 to a direct call; the page drops a
  // bad value.
  sort: "Sort by newest, quickest or az.",
  time: "Pick a time of 15, 30 or 60.",
  source: "Pick a source from the list.",
  // Add recipe (import.ts). Screenshots' limits are written out, not from MAX_SCREENSHOTS:
  // import.ts reads this object as it loads (a cycle), and the client finds a message by its
  // fixed text. A test ties them.
  link: "Paste a link to an Instagram, Facebook or YouTube post.",
  linkOrText: "Paste a link or the recipe's text.",
  linkTooLong: "Keep the link under 2000 characters.",
  linkOrTextType: "Send a link or a text.",
  text: "Paste more of the recipe: a line or two at least.",
  textTooLong: "Keep the text under 10,000 characters.",
  screenshots: "Add 1 to 4 screenshots: PNG, JPEG or WebP, up to 10 MB each.",
  // Why an import failed (server/src/worker): not a recipe and too long can't be retried (D23).
  notARecipe: "This doesn't look like a recipe.",
  tooLong: "This video is over 5 minutes. Pinch reads shorter ones.",
  couldntTurn: "We couldn't turn this into a recipe.",
} as const;
