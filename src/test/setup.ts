import "@testing-library/jest-dom/vitest";

import { cleanup, configure } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// findBy*/waitFor default to 1 s, which a busy CI runner can exceed on the first lazy import of
// the admin chunk or a whole-app re-render after afterPaint. Real failures still fail, just later.
configure({ asyncUtilTimeout: 5000 });

// jsdom has no layout engine: provide the browser APIs the app calls. Tests flip these flags to
// emulate a dark colour scheme or a wide screen with a mouse (they reset after every test),
// rather than spying on matchMedia: a spy would replace this shared stub for later tests.
export const mediaQueries = { dark: false, finePointer: false };

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn((query: string) => ({
    matches:
      (query.includes("dark") && mediaQueries.dark) ||
      (query.includes("pointer: fine") && mediaQueries.finePointer),
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

// jsdom doesn't implement modal dialogs; emulate the open/close state the app relies on.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

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
  mediaQueries.finePointer = false;
});
