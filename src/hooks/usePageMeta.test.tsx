import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { contentSnapshot } from "../data/snapshot";
import { SITE_URL } from "../lib/site";
import { renderApp } from "../test/render";

const head = {
  description: () => document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content,
  canonical: () => document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href,
  og: (property: string) =>
    document.head.querySelector<HTMLMetaElement>(`meta[property="og:${property}"]`)?.content,
  robots: () => document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content,
};

describe("usePageMeta", () => {
  it("sets the home page title, description, canonical and Open Graph tags", () => {
    renderApp("/");

    expect(document.title).toBe("Aashish Regmi, Backend & AI engineer");
    expect(head.description()).toBe(
      "Aashish Regmi, Backend & AI engineer in Kathmandu, Nepal. I build backends that stay up and AI that ships.",
    );
    expect(head.canonical()).toBe(`${SITE_URL}/`);
    expect(head.og("url")).toBe(`${SITE_URL}/`);
    expect(head.og("title")).toBe(document.title);
    expect(head.robots()).toBeUndefined();
  });

  it("follows client-side navigation to a case study", async () => {
    const user = userEvent.setup();
    const project = contentSnapshot.projects.find((p) => p.slug === "jarvis")!;
    renderApp("/");

    await user.click(screen.getByRole("link", { name: project.name }));

    expect(document.title).toBe(`${project.name} | Aashish Regmi`);
    expect(head.description()).toBe(project.summary);
    expect(head.canonical()).toBe(`${SITE_URL}/work/jarvis`);
    expect(head.og("description")).toBe(project.summary);
  });

  it("marks the 404 page noindex, and removes it again on the next page", async () => {
    const user = userEvent.setup();
    renderApp("/no-such-page");

    expect(document.title).toBe("Page not found | Aashish Regmi");
    expect(head.robots()).toBe("noindex");

    await user.click(screen.getByRole("link", { name: "Go to the home page" }));

    expect(head.robots()).toBeUndefined();
    expect(head.canonical()).toBe(`${SITE_URL}/`);
  });
});
