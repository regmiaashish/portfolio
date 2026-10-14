import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { projects } from "../data/projects";
import { renderApp } from "../test/render";

describe("routes", () => {
  it("renders the home page with every section and landmark", () => {
    renderApp("/");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("I build backends");
    for (const name of ["Selected work", "Stack and how I work", "Career", "Let's talk", "Pitch me"]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(document.title).toBe("Aashish Regmi, Backend & AI engineer");
  });

  it("links every project to its case-study page", () => {
    renderApp("/");

    for (const project of projects) {
      expect(screen.getByRole("link", { name: project.name })).toHaveAttribute(
        "href",
        `/work/${project.slug}`,
      );
    }
  });

  it("opens a case study from the work section", async () => {
    const user = userEvent.setup();
    renderApp("/");

    await user.click(screen.getByRole("link", { name: "Jarvis voice assistant" }));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Jarvis voice assistant");
    expect(screen.getByRole("link", { name: /Source code/ })).toHaveAttribute(
      "href",
      "https://github.com/regmiaashish/jarvis",
    );
    expect(document.title).toBe("Jarvis voice assistant | Aashish Regmi");
  });

  it("shows a not-found page for an unknown project", () => {
    renderApp("/work/does-not-exist");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Page not found");
  });

  it("shows a not-found page for an unknown path", () => {
    renderApp("/nope");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Page not found");
    expect(screen.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/");
  });

  it("has a skip link to the main content", () => {
    renderApp("/");

    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
  });

  it("opens external profiles safely in a new tab", () => {
    renderApp("/");

    const footer = screen.getByRole("contentinfo");
    for (const link of within(footer).getAllByRole("link")) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});
