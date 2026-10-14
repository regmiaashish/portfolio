import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// jsdom has no layout engine: provide the browser APIs the app calls.
export const mediaQueries = { dark: false };

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: query.includes("dark") ? mediaQueries.dark : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
Element.prototype.scrollIntoView = vi.fn();

// No test may reach a real server: unless a test stubs fetch itself, every request
// fails like an offline network.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new TypeError("fetch is not mocked in this test"))),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  mediaQueries.dark = false;
});
