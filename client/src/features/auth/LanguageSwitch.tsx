import { Button } from "../../components/ui/Button.tsx";
import { pageLanguage, saveLanguageOnDevice } from "../../i18n.ts";
import { reloadPage } from "../../lib/loadPage.ts";

// Under Log in's and Sign up's card (design §16.1): signed out, the page is in this device's
// language, or the browser's. This names the other language in itself (with its lang, so a screen
// reader says it right), keeps it on this device and reloads in it. Quiet: most never need it.
export function LanguageSwitch() {
  const other =
    pageLanguage() === "he"
      ? { language: "en" as const, name: "English" }
      : { language: "he" as const, name: "עברית" };
  return (
    <Button
      type="button"
      variant="link"
      lang={other.language}
      className="mt-4 font-normal text-text-muted"
      onClick={() => {
        saveLanguageOnDevice(other.language);
        reloadPage();
      }}
    >
      {other.name}
    </Button>
  );
}
