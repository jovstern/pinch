import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { loadPage, reloadPage } from "../../lib/loadPage.ts";
import { renderApp, renderInHebrew, stubFetch, testUser } from "../../test-utils.tsx";

// jsdom can't load a page: the tests see where the app would go.
vi.mock("../../lib/loadPage.ts", () => ({ loadPage: vi.fn(), reloadPage: vi.fn() }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(loadPage).mockClear();
  vi.mocked(reloadPage).mockClear();
});

const notFound = () => Promise.resolve(new Response(null, { status: 404 }));

async function fillLogin(password: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Email"), "cook@example.com");
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Log in" }));
}

async function fillSignup() {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Name"), "Dana");
  await user.type(screen.getByLabelText("Email"), "cook@example.com");
  await user.type(screen.getByLabelText("Password"), "a long password");
  await user.click(screen.getByRole("button", { name: "Sign up" }));
}

test("signed out, a page sends the user to Log in, which keeps the page to come back to", async () => {
  stubFetch(notFound);
  renderApp("/recipes?tags=meal:dinner", { me: null });
  expect(await screen.findByRole("heading", { level: 1, name: "Log in" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
    "href",
    "/signup?next=%2Frecipes%3Ftags%3Dmeal%3Adinner",
  );
});

test("me's null (nobody signed in, not an error) sends / to Log in", async () => {
  stubFetch((path) =>
    path === "/api/auth/me" ? Promise.resolve(Response.json(null)) : notFound(),
  );
  renderApp("/", { me: "ask" });
  expect(await screen.findByRole("heading", { level: 1, name: "Log in" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup");
});

test("logging in loads the page the user asked for, a new page for the new user", async () => {
  const fetch = vi.fn((path: string) =>
    path === "/api/auth/login" ? Promise.resolve(Response.json(testUser)) : notFound(),
  );
  stubFetch(fetch);
  renderApp("/login?next=%2Frecipes%3Fq%3Degg", { me: null });
  await fillLogin("a long password");
  await vi.waitFor(() => {
    expect(loadPage).toHaveBeenCalledWith("/recipes?q=egg");
  });
  expect(fetch).toHaveBeenCalledWith("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "cook@example.com", password: "a long password" }),
  });
});

test("a wrong email or password says they don't match", async () => {
  stubFetch(() => Promise.resolve(new Response(null, { status: 401 })));
  renderApp("/login", { me: null });
  await fillLogin("not it");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "That email and password don't match.",
  );
});

test("signed in, Log in sends the user on, but only to a page of the app", async () => {
  stubFetch(notFound);
  renderApp("/login?next=%2F%2Fother.example", { me: testUser });
  expect(await screen.findByRole("heading", { level: 1, name: "Add recipe" })).toBeInTheDocument();
});

test("signing up with an email that has an account says so, with a link to Log in", async () => {
  stubFetch(() =>
    Promise.resolve(
      Response.json(
        { error: { code: "email_taken", message: "This email can't sign up again." } },
        { status: 409 },
      ),
    ),
  );
  renderApp("/signup?next=%2Frecipes", { me: null });
  await fillSignup();
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("An account already uses this email. Log in");
  expect(screen.getAllByRole("link", { name: "Log in" })[0]).toHaveAttribute(
    "href",
    "/login?next=%2Frecipes",
  );
});

test("the 409's Log in link brings the email along, and focus goes to Password", async () => {
  stubFetch(() =>
    Promise.resolve(Response.json({ error: { code: "email_taken" } }, { status: 409 })),
  );
  renderApp("/signup", { me: null });
  await fillSignup();
  await userEvent.setup().click(within(await screen.findByRole("alert")).getByRole("link"));
  expect(await screen.findByRole("heading", { level: 1, name: "Log in" })).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveValue("cook@example.com");
  expect(screen.getByLabelText("Password")).toHaveFocus();
});

test("the last error goes while Log in tries again", async () => {
  let answer: (response: Response) => void = () => undefined;
  stubFetch(() => Promise.resolve(new Response(null, { status: 401 })));
  renderApp("/login", { me: null });
  await fillLogin("not it");
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  stubFetch(() => new Promise<Response>((resolve) => (answer = resolve)));
  await userEvent.setup().click(screen.getByRole("button", { name: "Log in" }));
  expect(await screen.findByRole("button", { name: "Logging in…" })).toHaveAttribute(
    "aria-busy",
    "true",
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  answer(new Response(null, { status: 401 }));
});

test("the API's field errors show on their fields, and focus goes to the first", async () => {
  stubFetch(() =>
    Promise.resolve(
      Response.json(
        { error: { code: "invalid_input", fields: { email: "Use another email." } } },
        { status: 400 },
      ),
    ),
  );
  renderApp("/signup", { me: null });
  await fillSignup();
  expect(await screen.findByText("Use another email.")).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("Email")).toHaveFocus();
});

test("a 401 from the API signs the user out and sends them to Log in", async () => {
  stubFetch((path) =>
    path.startsWith("/api/recipes")
      ? Promise.resolve(new Response(null, { status: 401 }))
      : notFound(),
  );
  renderApp("/recipes");
  expect(await screen.findByRole("heading", { level: 1, name: "Log in" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
    "href",
    "/signup?next=%2Frecipes",
  );
});

test("an empty email asks for one", async () => {
  stubFetch(notFound);
  renderApp("/login", { me: null });
  await userEvent.setup().click(await screen.findByRole("button", { name: "Log in" }));
  expect(await screen.findByText("Enter your email.")).toBeInTheDocument();
});

test("a 500 from Log in says something went wrong, not the connection", async () => {
  stubFetch(() => Promise.resolve(new Response(null, { status: 500 })));
  renderApp("/login", { me: null });
  await fillLogin("a long password");
  expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
});

test("when who's signed in can't be asked, the app says so, with Try again", async () => {
  let up = false;
  stubFetch((path) => {
    if (path === "/api/auth/me" && up) return Promise.resolve(Response.json(testUser));
    if (path === "/api/auth/me") return Promise.resolve(new Response(null, { status: 500 }));
    return notFound();
  });
  renderApp("/nope", { me: "ask" });
  expect(
    await screen.findByRole("heading", { level: 1, name: "We couldn't reach Pinch" }),
  ).toBeInTheDocument();
  // Announced, the message alone: <main> keeps its own role (axe).
  expect(screen.getByRole("alert")).toHaveTextContent("Check your connection");
  expect(screen.getByRole("main")).not.toHaveAttribute("role");
  up = true;
  await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
});

test("the avatar's menu names the user, and Log out loads plain Log in", async () => {
  const user = userEvent.setup();
  const fetch = vi.fn((path: string) =>
    path === "/api/auth/logout" ? Promise.resolve(new Response(null, { status: 204 })) : notFound(),
  );
  stubFetch(fetch);
  renderApp("/nope");
  await user.click(screen.getByRole("button", { name: "Your account" }));
  expect(await screen.findByRole("menu")).toHaveTextContent("Danacook@example.com");
  await user.click(screen.getByRole("menuitem", { name: "Log out" }));
  // Plain /login, as a new page: no ?next=, so Log in doesn't bring the next person back here.
  await vi.waitFor(() => {
    expect(loadPage).toHaveBeenCalledWith("/login");
  });
  expect(fetch).toHaveBeenCalledWith("/api/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
});

// The API's answer to /api/auth/providers, with Google on; anything else is a 404.
function googleOn(path: string) {
  return path === "/api/auth/providers"
    ? Promise.resolve(Response.json({ google: true }))
    : notFound();
}

test("with Google on, Continue with Google goes to the API, carrying next", async () => {
  stubFetch(googleOn);
  renderApp("/login?next=%2Frecipes%3Fq%3Degg", { me: null });
  expect(await screen.findByRole("link", { name: "Continue with Google" })).toHaveAttribute(
    "href",
    "/api/auth/google?next=%2Frecipes%3Fq%3Degg&lang=en",
  );
});

test("a failed Google sign-in says so on Log in, and not on Sign up", async () => {
  stubFetch(googleOn);
  renderApp("/login?next=%2Frecipes&error=google&reason=state", { me: null });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Couldn't sign in with Google. Try again.",
  );
  expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
    "href",
    "/signup?next=%2Frecipes",
  );
});

test("with Google off, Sign up offers no Google button", async () => {
  const fetch = vi.fn((path: string) =>
    path === "/api/auth/providers" ? Promise.resolve(Response.json({ google: false })) : notFound(),
  );
  stubFetch(fetch);
  renderApp("/signup", { me: null });
  expect(await screen.findByRole("button", { name: "Sign up" })).toBeInTheDocument();
  await vi.waitFor(() => {
    expect(fetch).toHaveBeenCalledWith("/api/auth/providers");
  });
  expect(screen.queryByRole("link", { name: "Continue with Google" })).not.toBeInTheDocument();
});

// The language (design §16.1).

test("picking עברית in the avatar's menu saves it on the account, then reloads the page", async () => {
  const user = userEvent.setup();
  const fetch = vi.fn((path: string) =>
    path === "/api/auth/me"
      ? Promise.resolve(Response.json({ ...testUser, language: "he" }))
      : notFound(),
  );
  stubFetch(fetch);
  renderApp("/nope");
  await user.click(screen.getByRole("button", { name: "Your account" }));
  const languages = await screen.findByRole("group", { name: "Language" });
  expect(within(languages).getByRole("menuitemradio", { name: "English" })).toBeChecked();
  const hebrew = within(languages).getByRole("menuitemradio", { name: "עברית" });
  expect(hebrew).toHaveAttribute("lang", "he");
  await user.click(hebrew);
  await vi.waitFor(() => {
    expect(reloadPage).toHaveBeenCalled();
  });
  expect(fetch).toHaveBeenCalledWith("/api/auth/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language: "he" }),
  });
});

test("while the language saves, the menu stays open and its choices are unavailable", async () => {
  const user = userEvent.setup();
  stubFetch((path) =>
    path === "/api/auth/me" ? new Promise<Response>(() => undefined) : notFound(),
  );
  renderApp("/nope");
  await user.click(screen.getByRole("button", { name: "Your account" }));
  await user.click(await screen.findByRole("menuitemradio", { name: "עברית" }));
  const languages = screen.getByRole("group", { name: "Language" });
  expect(languages).toHaveAttribute("aria-busy", "true");
  for (const name of ["English", "עברית"]) {
    expect(within(languages).getByRole("menuitemradio", { name })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  }
  expect(reloadPage).not.toHaveBeenCalled();
});

test("a language that couldn't be saved says so, with Try again, and doesn't reload", async () => {
  const user = userEvent.setup();
  let up = false;
  stubFetch((path) => {
    if (path !== "/api/auth/me") return notFound();
    if (!up) return Promise.reject(new TypeError("Failed to fetch"));
    return Promise.resolve(Response.json({ ...testUser, language: "he" }));
  });
  renderApp("/nope");
  await user.click(screen.getByRole("button", { name: "Your account" }));
  await user.click(await screen.findByRole("menuitemradio", { name: "עברית" }));
  expect(await screen.findByText("Couldn't save")).toBeInTheDocument();
  expect(reloadPage).not.toHaveBeenCalled();
  up = true;
  // fireEvent: userEvent's pointer down makes Sonner capture the pointer, which jsdom can't.
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await vi.waitFor(() => {
    expect(reloadPage).toHaveBeenCalled();
  });
});

test("signed out, the switch under Log in keeps עברית on this device and reloads", async () => {
  stubFetch(notFound);
  renderApp("/login", { me: null });
  const hebrew = await screen.findByRole("button", { name: "עברית" });
  expect(hebrew).toHaveAttribute("lang", "he");
  await userEvent.setup().click(hebrew);
  expect(document.cookie).toContain("pinch_lang=he");
  expect(reloadPage).toHaveBeenCalled();
  document.cookie = "pinch_lang=; Max-Age=0; Path=/";
});

test("Sign up sends the page's language, for the new account", async () => {
  const fetch = vi.fn((path: string) =>
    path === "/api/auth/signup" ? Promise.resolve(Response.json(testUser)) : notFound(),
  );
  stubFetch(fetch);
  renderApp("/signup", { me: null });
  await fillSignup();
  await vi.waitFor(() => {
    expect(loadPage).toHaveBeenCalledWith("/");
  });
  expect(fetch).toHaveBeenCalledWith("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "cook@example.com",
      password: "a long password",
      name: "Dana",
      language: "en",
    }),
  });
});

test("in Hebrew, Log in is in Hebrew, its switch names English, and a wrong password says so", async () => {
  const user = userEvent.setup();
  stubFetch(() => Promise.resolve(new Response(null, { status: 401 })));
  await renderInHebrew("/login", { me: null });
  expect(await screen.findByRole("heading", { level: 1, name: "להתחבר" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "להירשם" })).toHaveAttribute("href", "/signup");
  expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("lang", "en");
  await user.type(screen.getByLabelText("אימייל"), "cook@example.com");
  await user.type(screen.getByLabelText("סיסמה"), "not it");
  await user.click(screen.getByRole("button", { name: "להתחבר" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("האימייל והסיסמה לא תואמים.");
});

test("in Hebrew, Sign up is in Hebrew, with Log in's link", async () => {
  stubFetch(notFound);
  await renderInHebrew("/signup", { me: null });
  expect(await screen.findByRole("heading", { level: 1, name: "להירשם" })).toBeInTheDocument();
  expect(screen.getByLabelText("שם")).toBeInTheDocument();
  expect(screen.getByText("8 תווים לפחות.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "להתחבר" })).toHaveAttribute("href", "/login");
});

test("in Hebrew, the session's error is in Hebrew", async () => {
  stubFetch(() => Promise.resolve(new Response(null, { status: 500 })));
  await renderInHebrew("/nope", { me: "ask" });
  expect(
    await screen.findByRole("heading", { level: 1, name: "אין חיבור ל-Pinch" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "לנסות שוב" })).toBeInTheDocument();
});

test("in Hebrew, a language that couldn't be saved says so in a Hebrew toast, right to left", async () => {
  const user = userEvent.setup();
  stubFetch((path) =>
    path === "/api/auth/me" ? Promise.reject(new TypeError("Failed to fetch")) : notFound(),
  );
  await renderInHebrew("/nope", { me: { ...testUser, language: "he" } });
  await user.click(screen.getByRole("button", { name: "החשבון שלך" }));
  await user.click(await screen.findByRole("menuitemradio", { name: "English" }));
  const toast = (await screen.findByText("השמירה נכשלה")).closest("li");
  if (toast === null) throw new Error("השמירה נכשלה isn't in a toast");
  expect(toast).toHaveTextContent("כדאי לבדוק את החיבור");
  expect(within(toast).getByRole("button", { name: "לנסות שוב" })).toBeInTheDocument();
  // Sonner's list, in the page's direction (design §16.4).
  expect(toast.closest("ol")).toHaveAttribute("dir", "rtl");
  expect(reloadPage).not.toHaveBeenCalled();
});
