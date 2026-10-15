import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { contentSnapshot } from "../data/snapshot";
import type { SiteContent } from "../lib/cmsContracts";
import { isEmbeddableResume, RESUME_DOWNLOAD_URL } from "../lib/resume";
import { jsonResponse, mockApi } from "../test/fetch";
import { renderApp } from "../test/render";

/** Uploaded résumés are served by the API's media route (the bucket is private). */
const RESUME_URL = "https://api.test.example/api/v1/media/portfolio/resume/9b1f.pdf";
const EXTERNAL_RESUME_URL = "https://drive.example.com/cv.pdf";

function withResume(url = RESUME_URL): void {
  const content: SiteContent = {
    ...contentSnapshot,
    profile: { ...contentSnapshot.profile, resume_url: url },
    updated_at: "2026-10-14T10:00:00Z",
  };
  mockApi({ "GET /api/v1/content": () => jsonResponse(200, content) });
}

/**
 * Waits for the published résumé's download link. Polls a cheap selector rather than
 * findByRole, which computes accessible names across the whole layout on every retry and is
 * slow enough to time out on a busy machine.
 */
async function downloadLink(): Promise<HTMLElement> {
  await waitFor(() => expect(document.querySelector(`a[href="${RESUME_DOWNLOAD_URL}"]`)).not.toBeNull());
  return screen.getByRole("link", { name: "Download PDF" });
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
    // usePageMeta sets robots in an effect, which React may run just after the text is committed.
    await waitFor(() => expect(robots()).toBe("noindex"));
  });

  it("offers download and open links once a résumé is published, and is indexable", async () => {
    withResume();
    renderApp("/resume");

    const download = await downloadLink();
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

    await downloadLink();
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

  it("links to a résumé hosted elsewhere instead of framing it (the CSP only allows our media)", async () => {
    withResume(EXTERNAL_RESUME_URL);
    const original = window.matchMedia;
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
      const list = original(query);
      return { ...list, matches: query.includes("pointer: fine") ? true : list.matches };
    });
    renderApp("/resume");

    await waitFor(() => expect(document.querySelector(`a[href="${EXTERNAL_RESUME_URL}"]`)).not.toBeNull());
    expect(screen.getByRole("link", { name: /Open in new tab/ })).toHaveAttribute("href", EXTERNAL_RESUME_URL);
    expect(screen.getByText(/hosted elsewhere/)).toBeInTheDocument();
    expect(document.querySelector("iframe")).toBeNull();
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

describe("isEmbeddableResume", () => {
  it("accepts only the API's media route", () => {
    expect(isEmbeddableResume(RESUME_URL)).toBe(true);
    expect(isEmbeddableResume("https://api.test.example/api/v1/resume/download")).toBe(false);
    expect(isEmbeddableResume("https://api.test.example.evil.com/api/v1/media/x.pdf")).toBe(false);
    expect(isEmbeddableResume("https://bucket.s3.amazonaws.com/portfolio/resume/9b1f.pdf")).toBe(false);
    expect(isEmbeddableResume(EXTERNAL_RESUME_URL)).toBe(false);
    expect(isEmbeddableResume("not a url")).toBe(false);
  });
});
