import { Route, Routes } from "react-router";
import { Layout } from "./components/Layout.tsx";
import { NotFoundPage } from "./components/NotFoundPage.tsx";
import { EditRecipePage } from "./features/recipes/EditRecipePage.tsx";
import { NewRecipePage } from "./features/recipes/NewRecipePage.tsx";
import { RecipeListPage } from "./features/recipes/RecipeListPage.tsx";
import { RecipePage } from "./features/recipes/RecipePage.tsx";

// The screens (design §14).
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<RecipeListPage />} />
        <Route path="recipes/new" element={<NewRecipePage />} />
        <Route path="recipes/:id" element={<RecipePage />} />
        <Route path="recipes/:id/edit" element={<EditRecipePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
