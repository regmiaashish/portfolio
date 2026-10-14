import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { career } from "../data/career";
import { profile } from "../data/profile";
import { skillGroups } from "../data/skills";
import { renderApp } from "../test/render";

describe("About page", () => {
  it("shows a whoami readout built only from content", () => {
    renderApp("/about");

    const whoami = within(screen.getByLabelText("Profile summary"));
    expect(whoami.getByText(profile.name)).toBeInTheDocument();
    expect(whoami.getByText(profile.role)).toBeInTheDocument();
    expect(whoami.getByText(profile.location)).toBeInTheDocument();
    const now = career.find((entry) => entry.period === "Now")!;
    expect(whoami.getByText(`${now.role}, ${now.company}`)).toBeInTheDocument();
  });

  it("lights the current role as now and lists every career entry", () => {
    renderApp("/about");

    const timeline = within(screen.getByRole("region", { name: "Career" }));
    expect(timeline.getAllByRole("listitem")).toHaveLength(career.length);
    const current = timeline.getByText("now").closest("li")!;
    expect(within(current).getByRole("heading", { level: 3 })).toHaveTextContent(
      career.find((entry) => entry.period === "Now")!.role,
    );
    for (const entry of career.filter((e) => e.period !== "Now")) {
      expect(timeline.getByText(entry.period)).toBeInTheDocument();
    }
  });

  it("writes how I work only from the skill group descriptions, then lists the skills", () => {
    renderApp("/about");

    const stack = within(screen.getByRole("region", { name: "Stack and how I work" }));
    for (const group of skillGroups) {
      expect(stack.getByText(group.description)).toBeInTheDocument();
      expect(stack.getByRole("list", { name: `${group.title} skills` })).toBeInTheDocument();
    }
  });

  it("ends with links to contact and work", () => {
    renderApp("/about");

    expect(screen.getByRole("link", { name: "Get in touch" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "See my work" })).toHaveAttribute("href", "/work");
  });
});
