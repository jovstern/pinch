import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { startI18n } from "./i18n.ts";

// Testing Library only cleans up by itself when Vitest globals are on; they are off here.
afterEach(cleanup);

// The tests are in English, the default (design §16.11), as main.tsx starts a page in English.
await startI18n("en");
