import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderApp } from "../../test/render";

describe("Header mobile menu", () => {
  it("opens and closes, reflecting state in aria-expanded", async () => {
    const user = userEvent.setup();
    renderApp();
    const toggle = screen.getByRole("button", { name: "Open menu" });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "site-nav");

    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("closes on Escape and returns focus to the toggle", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await user.keyboard("{Escape}");

    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });

  it("closes after following a link", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const nav = screen.getByRole("navigation", { name: "Main" });
    await user.click(within(nav).getByRole("link", { name: "Contact" }));

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
