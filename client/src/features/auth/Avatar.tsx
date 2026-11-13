import type { Me } from "@pinch/shared";
import { useState, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button.tsx";

// The header's avatar (design §14, D24): the user's Google picture (§8.3), else the first letter of
// their name, in a 44 px circle. A button that opens their menu; the props are the menu's (Radix's
// trigger, or LazyUserMenu's).
export function Avatar({ me, ...props }: { me: Me } & ComponentProps<"button">) {
  const { t } = useTranslation();
  // A picture that doesn't load is as none, as Thumbnail's: the letter, no broken-image icon.
  const [failedPicture, setFailedPicture] = useState<string>();
  const picture = me.picture === failedPicture ? undefined : me.picture;
  return (
    <Button
      type="button"
      variant="secondary"
      aria-label={t("header.account")}
      aria-haspopup="menu"
      className="size-11 shrink-0 rounded-full px-0 text-lg"
      {...props}
    >
      {picture ? (
        <img
          // Google's address ends with its size, "=s96-c" (96 px, cropped square): 132 is the 44 px
          // circle on a 3× screen. An address without it is used as it is.
          src={picture.replace(/=s\d+-c$/, "=s132-c")}
          // The button has the name; the picture adds nothing to it.
          alt=""
          // Google's image host can refuse a request that names the page it's on (a 403).
          referrerPolicy="no-referrer"
          // Its box is the circle's before it loads, so nothing moves.
          width={44}
          height={44}
          onError={() => {
            setFailedPicture(picture);
          }}
          className="size-full rounded-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{me.name.charAt(0).toUpperCase()}</span>
      )}
    </Button>
  );
}
