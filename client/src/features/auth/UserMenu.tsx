import { LanguageSchema, type Me } from "@pinch/shared";
import { useMutation } from "@tanstack/react-query";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/DropdownMenu.tsx";
import { loadPage, reloadPage } from "../../lib/loadPage.ts";
import { setTheme, useTheme } from "../../lib/theme.ts";
import { toastCouldntSave } from "../../lib/toasts.tsx";
import { Avatar } from "./Avatar.tsx";
import { changeLanguage, logOut } from "./authQueries.ts";

// The avatar's menu (design §14): who is signed in, the language, the theme, and Log out. Loaded
// on its first press (LazyUserMenu), and open as it appears.
// A language picked keeps the menu open: it shows the save under way, until the page reloads. A
// theme picked too: it shows at once around the menu, so another can be tried beside it.
function keepOpen(event: Event) {
  event.preventDefault();
}

// The theme's choices, each with its picture: the screen, the sun, the moon.
const themes = [
  { value: "system", Icon: Monitor, label: "header.themeSystem" },
  { value: "light", Icon: Sun, label: "header.themeLight" },
  { value: "dark", Icon: Moon, label: "header.themeDark" },
] as const;

export function UserMenu({ me }: { me: Me }) {
  const { t } = useTranslation();
  const languageId = useId();
  const themeId = useId();
  const theme = useTheme();
  // Signed out: Log in, as a new page (design §8.3: a change of user leaves nothing of the last
  // one's), and plain /login, without the page they were on: they chose to leave it, and the
  // next person on this device shouldn't land on it.
  const logOutNow = useMutation({
    mutationFn: logOut,
    onSuccess: () => {
      loadPage("/login");
    },
    onError: () => {
      toastCouldntSave(() => {
        logOutNow.mutate();
      }, "Couldn't log out");
    },
  });
  // Saved on the account, then the same page again, all of it in the new language (§16.1, D40).
  // The menu stays open while it saves, its choices unavailable until the reload (isSuccess); a
  // failure makes them available again, beside its toast.
  const switchLanguage = useMutation({
    mutationFn: changeLanguage,
    onSuccess: reloadPage,
    onError: (_error, language) => {
      toastCouldntSave(() => {
        switchLanguage.mutate(language);
      });
    },
  });
  const saving = switchLanguage.isPending || switchLanguage.isSuccess;
  return (
    // Not modal, as RecipeMenu: a modal menu hides the page from screen readers (axe).
    <DropdownMenu modal={false} defaultOpen>
      <DropdownMenuTrigger asChild>
        <Avatar me={me} />
      </DropdownMenuTrigger>
      {/* A fixed width, so a short name doesn't make a narrow menu; never wider than the screen.
          A long name or email is cut, and its title shows it whole. The name reads in its own
          direction, the email left to right, so it's cut at its end in Hebrew too (D43); each sits
          at the menu's start all the same, as a column's item (a block would align by its own
          direction, an English name to the left of a Hebrew menu). */}
      <DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel className="flex flex-col items-start">
          <span title={me.name} dir="auto" className="block max-w-full truncate font-semibold">
            {me.name}
          </span>
          <span
            title={me.email}
            dir="ltr"
            className="block max-w-full truncate text-sm text-text-muted"
          >
            {me.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel id={languageId} className="pb-1 text-sm text-text-muted">
          {t("header.language")}
        </DropdownMenuLabel>
        {/* Each language named in itself, with its lang, so a screen reader says it right. */}
        <DropdownMenuRadioGroup
          aria-labelledby={languageId}
          aria-busy={saving}
          value={me.language}
          onValueChange={(value) => {
            const language = LanguageSchema.parse(value);
            if (language !== me.language) switchLanguage.mutate(language);
          }}
        >
          <DropdownMenuRadioItem value="en" lang="en" disabled={saving} onSelect={keepOpen}>
            English
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="he" lang="he" disabled={saving} onSelect={keepOpen}>
            עברית
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel id={themeId} className="pb-1 text-sm text-text-muted">
          {t("header.theme")}
        </DropdownMenuLabel>
        {/* Saved on this device, not the account (lib/theme.ts): it applies at once. */}
        <DropdownMenuRadioGroup aria-labelledby={themeId} value={theme}>
          {themes.map(({ value, Icon, label }) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              className="gap-2"
              onSelect={(event) => {
                keepOpen(event);
                setTheme(value);
              }}
            >
              <Icon aria-hidden="true" className="size-4" />
              {t(label)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            logOutNow.mutate();
          }}
        >
          {/* Its arrow points the reading way, so it mirrors in Hebrew (design §16.4). */}
          <LogOut aria-hidden="true" className="rtl:-scale-x-100" />
          {t("header.logOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
