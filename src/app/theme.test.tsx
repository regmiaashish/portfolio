import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { THEME_STORAGE_KEY } from "../hooks/useTheme";
import { mediaQueries } from "../test/setup";
import { renderApp } from "../test/render";

describe("theme", () => {
  it("follows the system by default and stores nothing", () => {
    renderApp();

    expect(document.documentElement).not.toHaveAttribute("data-theme");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeInTheDocument();
  });

  it("toggles to dark, remembers it, and returns to following the system", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    // Light is what the system prefers, so choosing it means "follow the system" again.
    await user.click(screen.getByRole("button", { name: "Switch to light theme" }));
    expect(document.documentElement).not.toHaveAttribute("data-theme");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("starts dark when the system prefers dark", () => {
    mediaQueries.dark = true;
    renderApp();

    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
  });

  it("restores a saved choice over the system preference", () => {
    mediaQueries.dark = true;
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    renderApp();

    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });
});
