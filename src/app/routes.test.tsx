import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { projects } from "../data/projects";
import { renderApp } from "../test/render";

function mainNav() {
  return within(screen.getByRole("navigation", { name: "Main" }));
}

describe("routes", () => {
  it("renders the home page with its sections and landmarks", () => {
    renderApp("/");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("I build backends");
    for (const name of [
      "Selected work",
      "About",
      "Hiring for a backend or AI role?",
      "Let three AI agents pitch me",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Live system status" })).toBeInTheDocument();
    expect(document.title).toBe("Aashish Regmi, Backend & AI engineer");
  });

  it("features the first three projects on the home page and links to all work", () => {
    renderApp("/");

    const featured = within(screen.getByRole("list", { name: "Featured projects" }));
    expect(featured.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("link", { name: `All ${projects.length} projects` })).toHaveAttribute(
      "href",
      "/work",
    );
  });

  it("links every project to its case-study page from /work", () => {
    renderApp("/work");

    expect(screen.getByRole("heading", { level: 1, name: "Work" })).toBeInTheDocument();
    for (const project of projects) {
      expect(screen.getByRole("link", { name: project.name })).toHaveAttribute(
        "href",
        `/work/${project.slug}`,
      );
    }
    expect(document.title).toBe("Work | Aashish Regmi");
  });

  it("opens a case study from the work page and links back", async () => {
    const user = userEvent.setup();
    renderApp("/work");

    await user.click(screen.getByRole("link", { name: "Jarvis voice assistant" }));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Jarvis voice assistant");
    expect(screen.getByRole("link", { name: /Source code/ })).toHaveAttribute(
      "href",
      "https://github.com/regmiaashish/jarvis",
    );
    expect(screen.getByRole("link", { name: "All work" })).toHaveAttribute("href", "/work");
    expect(document.title).toBe("Jarvis voice assistant | Aashish Regmi");
  });

  it.each([
    ["/pitch", "Pitch Me", "Pitch Me | Aashish Regmi"],
    ["/about", "About", "About | Aashish Regmi"],
    ["/contact", "Contact", "Contact | Aashish Regmi"],
  ])("renders %s with its own h1 and title", (url, heading, title) => {
    renderApp(url);

    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(document.title).toBe(title);
  });

  it("shows career and stack on the about page and the form on the contact page", () => {
    const about = renderApp("/about");
    expect(screen.getByRole("heading", { level: 2, name: "Career" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Stack and how I work" })).toBeInTheDocument();
    about.unmount();

    renderApp("/contact");
    expect(screen.getByRole("heading", { level: 2, name: "Send a message" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send message/ })).toBeInTheDocument();
  });

  it("marks the current page in the main navigation", async () => {
    const user = userEvent.setup();
    renderApp("/about");

    expect(mainNav().getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
    expect(mainNav().getByRole("link", { name: "Work" })).not.toHaveAttribute("aria-current");

    await user.click(mainNav().getByRole("link", { name: "Work" }));

    expect(mainNav().getByRole("link", { name: "Work" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { level: 1, name: "Work" })).toBeInTheDocument();
  });

  it.each([
    ["/#work", "Work"],
    ["/#pitch", "Pitch Me"],
    ["/#contact", "Contact"],
    ["/#career", "About"],
  ])("redirects the old anchor %s to its page", (url, heading) => {
    renderApp(url);

    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
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

    const footer = within(screen.getByRole("contentinfo"));
    const external = footer
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("http"));
    expect(external.length).toBeGreaterThan(0);
    for (const link of external) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link).toHaveAccessibleName(/\(opens in a new tab\)$/);
    }
  });
});

describe("work page images", () => {
  it("loads only the first project image eagerly", () => {
    renderApp("/work");

    const images = screen.getAllByRole("img").filter((img) => img.tagName === "IMG");
    expect(images[0]).toHaveAttribute("loading", "eager");
    expect(images[0]).toHaveAttribute("fetchpriority", "high");
    for (const image of images.slice(1)) expect(image).toHaveAttribute("loading", "lazy");
  });
});
