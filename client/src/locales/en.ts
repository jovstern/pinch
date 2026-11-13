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
} as const;
