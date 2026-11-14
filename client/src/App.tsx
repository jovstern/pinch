import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { Layout } from "./components/Layout.tsx";
import { NotFoundPage } from "./components/NotFoundPage.tsx";
import { SessionGate } from "./features/auth/SessionGate.tsx";
import { LazyCookPage } from "./features/cook/LazyCookPage.tsx";
import { ImportPage } from "./features/imports/ImportPage.tsx";
import { ReviewImportPage } from "./features/imports/ReviewImportPage.tsx";
import { EditRecipePage } from "./features/recipes/EditRecipePage.tsx";
import { NewRecipePage } from "./features/recipes/NewRecipePage.tsx";
import { RecipeListPage } from "./features/recipes/RecipeListPage.tsx";
import { RecipePage } from "./features/recipes/RecipePage.tsx";

// Log in and Sign up are their own chunks: a signed-in user never needs them, so they cost the
// app's pages nothing (its JS budget, docs/metrics). No fallback: the page is all there is.
const LoginPage = lazy(async () => ({
  default: (await import("./features/auth/LoginPage.tsx")).LoginPage,
}));
const SignupPage = lazy(async () => ({
  default: (await import("./features/auth/SignupPage.tsx")).SignupPage,
}));
// All recipes' placeholder (design §14.1): its own chunk too, as nothing else needs it.
const ExplorePage = lazy(async () => ({
  default: (await import("./features/explore/ExplorePage.tsx")).ExplorePage,
}));

// The screens (design §14): / is Add recipe, /recipes My recipes, /explore All recipes (D24). Log
// in and Sign up are for a signed-out visitor, everything else for a signed-in user (SessionGate,
// §8.3).
export function App() {
  return (
    <Routes>
      <Route element={<SessionGate signedIn={false} />}>
        <Route
          path="login"
          element={
            <Suspense>
              <LoginPage />
            </Suspense>
          }
        />
        <Route
          path="signup"
          element={
            <Suspense>
              <SignupPage />
            </Suspense>
          }
        />
      </Route>
      <Route element={<SessionGate signedIn />}>
        <Route element={<Layout />}>
          <Route index element={<ImportPage />} />
          <Route path="recipes" element={<RecipeListPage />} />
          <Route path="recipes/new" element={<NewRecipePage />} />
          <Route path="recipes/:id" element={<RecipePage />} />
          <Route path="recipes/:id/edit" element={<EditRecipePage />} />
          <Route path="recipes/:id/cook" element={<LazyCookPage />} />
          <Route path="imports/:id" element={<ReviewImportPage />} />
          <Route
            path="explore"
            element={
              <Suspense>
                <ExplorePage />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
