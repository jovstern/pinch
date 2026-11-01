import { Route, Routes } from "react-router";
import { Layout } from "./components/Layout.tsx";
import { NotFoundPage } from "./components/NotFoundPage.tsx";
import { RecipeListPage } from "./features/recipes/RecipeListPage.tsx";
import { RecipePage } from "./features/recipes/RecipePage.tsx";

// The screens (design §14). New and edit arrive with the form, the next M2 slice.
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<RecipeListPage />} />
        <Route path="recipes/:id" element={<RecipePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
