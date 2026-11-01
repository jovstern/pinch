import { Route, Routes } from "react-router";
import { Layout } from "./components/Layout.tsx";
import { NotFoundPage } from "./components/NotFoundPage.tsx";
import { RecipeListPage } from "./features/recipes/RecipeListPage.tsx";

// The screens (design §14). New, a recipe, and edit arrive in the next M2 slices.
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<RecipeListPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
