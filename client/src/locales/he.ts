import type { Translation } from "../i18n.ts";
import type { en } from "./en.ts";

// The interface in Hebrew (design §16.3, §16.9): the same keys as en.ts (tsc fails on a missing or
// an extra one), fetched only when the page is in Hebrew, before its first render (main.tsx). No
// gendered imperatives: an action in the infinitive. Pinch, Google and the platforms' names stay
// in English (D46).
export const he: Translation<typeof en> = {
  header: {
    home: "Pinch, להוסיף מתכון",
    nav: "ראשי",
    addRecipe: "להוסיף מתכון",
    readyToReview: "לבדיקה",
    myRecipes: "המתכונים שלי",
    recipeCount_one: "מתכון",
    recipeCount_other: "מתכונים",
    writeRecipe: "לכתוב מתכון",
    account: "החשבון שלך",
    language: "שפה",
    logOut: "להתנתק",
    couldntLogOut: "ההתנתקות נכשלה",
  },
};
