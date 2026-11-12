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
    couldntLogOut: "Couldn't log out",
  },
} as const;
