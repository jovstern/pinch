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
  },
  frame: {
    notFound: "הדף לא נמצא",
    nothingHere: "אין כלום בכתובת הזאת.",
    backToRecipes: "לחזור למתכונים שלי",
    didntLoad: "הדף לא נטען",
    checkAndReload: "כדאי לבדוק את החיבור ולטעון את הדף מחדש.",
  },
  auth: {
    logIn: "להתחבר",
    loggingIn: "התחברות…",
    newToPinch: "פעם ראשונה ב-Pinch?",
    signUp: "להירשם",
    signingUp: "הרשמה…",
    haveAccount: "כבר יש חשבון?",
    name: "שם",
    email: "אימייל",
    password: "סיסמה",
    passwordHint: "8 תווים לפחות.",
    or: "או",
    continueWithGoogle: "להמשיך עם Google",
    googleFailed: "ההתחברות עם Google נכשלה. אפשר לנסות שוב.",
    noMatch: "האימייל והסיסמה לא תואמים.",
    emailTaken: "כבר יש חשבון עם האימייל הזה.",
    tooManyTries: "יותר מדי ניסיונות. אפשר לנסות שוב בעוד דקה.",
    unreachable: "אין חיבור ל-Pinch. אפשר לנסות שוב.",
    somethingWrong: "משהו השתבש. אפשר לנסות שוב.",
    cantReach: "אין חיבור ל-Pinch",
    checkAndTryAgain: "כדאי לבדוק את החיבור ולנסות שוב.",
    tryAgain: "לנסות שוב",
    trying: "ניסיון נוסף…",
  },
};
