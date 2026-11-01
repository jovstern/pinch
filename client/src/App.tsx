import { lazy } from "react";
import { Route, Routes } from "react-router";
import { Layout } from "./components/Layout.tsx";
import { NotFoundPage } from "./components/NotFoundPage.tsx";
import { RecipeListPage } from "./features/recipes/RecipeListPage.tsx";
import { RecipePage } from "./features/recipes/RecipePage.tsx";

// The form and its library load only when a form opens: in the first load they'd put the JS
// over its 150 kB budget (docs/metrics/m01.md). Layout shows "Loading…" meanwhile.
const NewRecipePage = lazy(async () => ({
  default: (await import("./features/recipes/NewRecipePage.tsx")).NewRecipePage,
}));

// The screens (design §14). Edit arrives in the next M2 slice.
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<RecipeListPage />} />
        <Route path="recipes/new" element={<NewRecipePage />} />
        <Route path="recipes/:id" element={<RecipePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
