import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App.tsx";
import "./globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");

// One retry, not TanStack's default three (about 7 s): an error shows up quickly.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
