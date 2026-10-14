import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { contentSnapshot } from "../data/snapshot";
import type { SiteContent } from "../lib/cmsContracts";
import { RESUME_DOWNLOAD_URL } from "../lib/resume";
import { jsonResponse, mockApi } from "../test/fetch";
import { renderApp } from "../test/render";

const RESUME_URL = "https://bucket.s3.ap-south-1.amazonaws.com/portfolio/resume/9b1f.pdf";

function withResume(): void {
  const content: SiteContent = {
    ...contentSnapshot,
    profile: { ...contentSnapshot.profile, resume_url: RESUME_URL },
    updated_at: "2026-10-14T10:00:00Z",
  };
  mockApi({ "GET /api/v1/content": () => jsonResponse(200, content) });
}

function robots(): string | null {
  return document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content ?? null;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("/resume", () => {
  it("shows a loading state, not 'unavailable', while the content request is in flight", () => {
    mockApi({ "GET /api/v1/content": () => new Promise<Response>(() => {}) });
    renderApp("/resume");

    expect(screen.getByText("Loading the latest résumé…")).toBeInTheDocument();
    expect(screen.queryByText(/isn.t published yet/)).not.toBeInTheDocument();
    expect(robots()).not.toBe("noindex");
  });

  it("shows a calm 'not available yet' state, noindexed, when no résumé is set", async () => {
    mockApi({ "GET /api/v1/content": () => jsonResponse(200, contentSnapshot) });
    renderApp("/resume");

    expect(screen.getByRole("heading", { level: 1, name: "Résumé" })).toBeInTheDocument();
    expect(await screen.findByText(/isn.t published yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ask for a copy" })).toHaveAttribute("href", "/contact");
    expect(screen.queryByRole("link", { name: "Download PDF" })).not.toBeInTheDocument();
    expect(robots()).toBe("noindex");
  });

  it("offers download and open links once a résumé is published, and is indexable", async () => {
    withResume();
    renderApp("/resume");

    const download = await screen.findByRole("link", { name: "Download PDF" });
    expect(download).toHaveAttribute("href", RESUME_DOWNLOAD_URL);
    expect(RESUME_DOWNLOAD_URL).toBe("https://api.test.example/api/v1/resume/download");

    const open = screen.getByRole("link", { name: /Open in new tab/ });
    expect(open).toHaveAttribute("href", RESUME_URL);
    expect(open).toHaveAttribute("target", "_blank");
    expect(open).toHaveAttribute("rel", "noopener noreferrer");
    expect(robots()).not.toBe("noindex");
    expect(document.title).toMatch(/^Résumé/);
  });

  it("on small or touch screens, the viewer loads only when asked", async () => {
    withResume();
    const user = userEvent.setup();
    renderApp("/resume");

    await screen.findByRole("link", { name: "Download PDF" });
    expect(document.querySelector("iframe")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Preview here" }));
    expect(screen.getByTitle(/résumé \(PDF\)/)).toHaveAttribute("src", RESUME_URL);
  });

  it("on wide screens with a mouse, shows the PDF inline straight away", async () => {
    withResume();
    const original = window.matchMedia;
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
      const list = original(query);
      return { ...list, matches: query.includes("pointer: fine") ? true : list.matches };
    });
    renderApp("/resume");

    expect(await screen.findByTitle(/résumé \(PDF\)/)).toHaveAttribute("src", RESUME_URL);
    expect(screen.queryByRole("button", { name: "Preview here" })).not.toBeInTheDocument();
  });

  it("is in the main navigation, marked current on its page", () => {
    renderApp("/resume");

    const nav = screen.getByRole("navigation", { name: "Main" });
    const link = within(nav).getByRole("link", { name: "Résumé" });
    expect(link).toHaveAttribute("href", "/resume");
    expect(link).toHaveAttribute("aria-current", "page");
  });
});
