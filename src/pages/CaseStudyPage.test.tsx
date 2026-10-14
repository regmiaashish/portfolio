import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { contentSnapshot } from "../data/snapshot";
import type { SiteContent } from "../lib/cmsContracts";
import { renderWork } from "../test/workRender";

const withCaseStudy: SiteContent = {
  ...contentSnapshot,
  projects: contentSnapshot.projects.map((project) =>
    project.slug === "jarvis"
      ? {
          ...project,
          case_study: {
            problem: "Problem text.",
            role: "Role text.",
            decisions: ["First decision.", "Second decision."],
            result: "Result text.",
          },
        }
      : project,
  ),
};

describe("case study page", () => {
  it("shows the project header, one h1 and a meta panel of real facts", () => {
    renderWork("/work/jarvis");

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Jarvis voice assistant");
    const meta = screen.getByRole("complementary", { name: "Project details" });
    expect(meta).toHaveTextContent("source");
    expect(meta).toHaveTextContent("public");
    expect(within(meta).getByRole("list", { name: "Jarvis voice assistant stack" })).toBeInTheDocument();
  });

  it("says the source is not public for company projects", () => {
    renderWork("/work/gains-garage");

    expect(screen.getByRole("complementary", { name: "Project details" })).toHaveTextContent(
      "not public",
    );
    expect(screen.queryByRole("link", { name: /Source code/ })).not.toBeInTheDocument();
  });

  it("shows an in-progress panel when the case study isn't written", () => {
    renderWork("/work/jarvis");

    const pending = screen.getByRole("region", { name: "Case study in progress" });
    expect(within(pending).getByText("being written")).toBeInTheDocument();
    expect(within(pending).getByRole("list", { name: "What the case study will cover" })).toBeInTheDocument();
  });

  it("lays out a written case study as problem, role, decisions and result", () => {
    renderWork("/work/jarvis", withCaseStudy);

    const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual(["Project details", "The problem", "My role", "Key decisions", "Result"]);
    expect(screen.getByText("Second decision.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Case study in progress" })).not.toBeInTheDocument();

    const contents = screen.getByRole("navigation", { name: "contents" });
    expect(within(contents).getByRole("link", { name: "decisions" })).toHaveAttribute("href", "#decisions");
  });

  it("links to the previous and next project, wrapping at the ends", () => {
    renderWork("/work/fagoon-upgrade");

    const pager = screen.getByRole("navigation", { name: "More projects" });
    expect(within(pager).getByRole("link", { name: /previous.*Cricket management system/ })).toHaveAttribute(
      "href",
      "/work/cricket-management-system",
    );
    expect(within(pager).getByRole("link", { name: /next.*Gains Garage backend/ })).toHaveAttribute(
      "href",
      "/work/gains-garage",
    );
  });

  it("moves to the next project and back to all work", async () => {
    const user = userEvent.setup();
    const { location } = renderWork("/work/jarvis");

    await user.click(screen.getByRole("link", { name: /next.*Cricket management system/ }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Cricket management system");

    await user.click(screen.getByRole("link", { name: "All work" }));
    expect(location()?.pathname).toBe("/work");
  });
});
