import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { renderApp, stubFetch, testUser } from "../../test-utils.tsx";

afterEach(() => {
  vi.unstubAllGlobals();
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

test("logging in takes the user on to the page they asked for", async () => {
  const fetch = vi.fn((path: string) =>
    path === "/api/auth/login" ? Promise.resolve(Response.json(testUser)) : notFound(),
  );
  stubFetch(fetch);
  renderApp("/login?next=%2Fnope", { me: null });
  await fillLogin("a long password");
  expect(await screen.findByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
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
  expect(alert).toHaveTextContent("This email can't sign up again.");
  expect(screen.getAllByRole("link", { name: "Log in" })[0]).toHaveAttribute(
    "href",
    "/login?next=%2Frecipes",
  );
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
