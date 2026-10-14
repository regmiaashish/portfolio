import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { projects } from "../data/projects";
import { COLLAPSED_COUNT } from "../components/sections/StackFilter";
import { stackOptions } from "../lib/workFilters";
import { renderWork } from "../test/workRender";

const filterGroup = () => screen.getByRole("group", { name: /filter --stack/ });
const toggle = (name: string) =>
  within(filterGroup()).getByRole("button", { name: new RegExp(`^${name}\\b`) });
const projectLinks = () =>
  within(screen.getByRole("list", { name: "All projects" }))
    .getAllByRole("link")
    .map((link) => link.textContent);

describe("/work filters", () => {
  it("lists every technology as an unpressed toggle with its project count", () => {
    renderWork("/work");

    const toggles = within(filterGroup()).getAllByRole("button", { pressed: false });
    expect(toggles).toHaveLength(COLLAPSED_COUNT);
    // jsdom drops spaces inside visually hidden spans; real browsers read "Python, 4 projects".
    expect(toggle("Python")).toHaveAccessibleName(/^Python,\s*4\s*projects$/);
    expect(screen.getByRole("status")).toHaveTextContent("showing all 5 projects");
  });

  it("filters by a technology and records it in the URL", async () => {
    const user = userEvent.setup();
    const { location } = renderWork("/work");

    await user.click(toggle("Django"));

    expect(toggle("Django")).toHaveAttribute("aria-pressed", "true");
    expect(projectLinks()).toEqual(["Cricket management system"]);
    expect(screen.getByRole("status")).toHaveTextContent("showing 1 of 5 projects");
    expect(location()?.search).toBe("?stack=Django");
  });

  it("restores a shared filtered view from the URL (any of the technologies)", () => {
    renderWork("/work?stack=Twilio&stack=Django");

    expect(toggle("Twilio")).toHaveAttribute("aria-pressed", "true");
    expect(toggle("Django")).toHaveAttribute("aria-pressed", "true");
    expect(projectLinks()).toEqual([
      "Fagoon Upgrade",
      "Alliance backend",
      "Cricket management system",
    ]);
  });

  it("clears every filter", async () => {
    const user = userEvent.setup();
    const { location } = renderWork("/work?stack=Django");

    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(projectLinks()).toHaveLength(5);
    expect(location()?.search).toBe("");
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("toggling a technology off removes it from the URL", async () => {
    const user = userEvent.setup();
    const { location } = renderWork("/work?stack=Django&stack=Stripe");

    await user.click(toggle("Django"));

    expect(location()?.search).toBe("?stack=Stripe");
    expect(toggle("Django")).toHaveAttribute("aria-pressed", "false");
  });

  it("shows an empty state for a filter nothing matches", async () => {
    const user = userEvent.setup();
    renderWork("/work?stack=Rust");

    expect(screen.getByRole("heading", { level: 2, name: "No projects match" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "All projects" })).not.toBeInTheDocument();

    const [, panelClear] = screen.getAllByRole("button", { name: "Clear filters" });
    await user.click(panelClear);

    expect(projectLinks()).toHaveLength(5);
  });
});

describe("/work filter overflow", () => {
  it("shows the most-used technologies first and expands to all of them", async () => {
    const user = userEvent.setup();
    renderWork("/work");
    const total = stackOptions(projects).length;
    const more = screen.getByRole("button", { name: `Show all ${total} technologies` });

    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(within(filterGroup()).queryByRole("button", { name: /^SpeechRecognition/ })).not.toBeInTheDocument();

    await user.click(more);

    expect(screen.getByRole("button", { name: "Show fewer technologies" })).toHaveAttribute("aria-expanded", "true");
    expect(within(filterGroup()).getAllByRole("button", { pressed: false })).toHaveLength(total);
  });

  it("keeps a selected technology visible while collapsed", () => {
    renderWork("/work?stack=SpeechRecognition");

    expect(toggle("SpeechRecognition")).toHaveAttribute("aria-pressed", "true");
    expect(within(filterGroup()).getAllByRole("button", { pressed: false })).toHaveLength(COLLAPSED_COUNT);
  });
});

describe("/work header readouts", () => {
  it("shows only numbers derived from the content", () => {
    renderWork("/work");

    const readouts = document.querySelector('dl[aria-label="Work at a glance"]');
    const text = readouts?.textContent ?? "";
    expect(text).toContain("projects5");
    expect(text).toContain("case studies0");
    expect(text).toContain("open source2");
    expect(text).toContain(`technologies${stackOptions(projects).length}`);
  });
});
