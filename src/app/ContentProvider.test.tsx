import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { contentSnapshot } from "../data/snapshot";
import type { SiteContent } from "../lib/cmsContracts";
import { CONTENT_CACHE_KEY } from "./ContentProvider";
import { jsonResponse, mockApi } from "../test/fetch";
import { renderApp } from "../test/render";

const API_CONTENT: SiteContent = {
  ...contentSnapshot,
  profile: { ...contentSnapshot.profile, tagline: "Edited from the admin dashboard." },
  projects: [
    {
      ...contentSnapshot.projects[0],
      id: "1d6c2c1e-0000-4000-8000-000000000001",
      name: "Brand new project",
      slug: "brand-new",
      image: { url: "https://cdn.example.com/portfolio/a.png", alt: "Screenshot", width: 1200, height: 750 },
    },
  ],
  updated_at: "2026-10-14T10:00:00Z",
};

describe("ContentProvider", () => {
  it("renders the snapshot immediately and swaps in API content", async () => {
    mockApi({ "GET /api/v1/content": () => jsonResponse(200, API_CONTENT) });
    renderApp("/");

    // Never empty: the snapshot is on screen before the API answers.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(contentSnapshot.profile.tagline);

    expect(await screen.findByRole("heading", { level: 1, name: "Edited from the admin dashboard." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Brand new project" })).toHaveAttribute("href", "/work/brand-new");
    expect(screen.getByRole("img", { name: "Screenshot" })).toHaveAttribute(
      "src",
      "https://cdn.example.com/portfolio/a.png",
    );
  });

  it.each([
    ["a 503", () => jsonResponse(503, { success: false, message: "Unavailable", errors: { code: "content_unavailable" } })],
    ["a malformed body", () => jsonResponse(200, { profile: null })],
    ["an HTML error page", () => new Response("<html>bad gateway</html>", { status: 502 })],
  ])("keeps the snapshot on %s", async (_name, handler) => {
    const fetchMock = mockApi({ "GET /api/v1/content": handler });
    renderApp("/");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(contentSnapshot.profile.tagline);
    expect(screen.getByRole("link", { name: contentSnapshot.projects[0].name })).toBeInTheDocument();
  });

  it("keeps the snapshot when the network is down", async () => {
    renderApp("/"); // setup.ts makes every unmocked fetch fail like an offline network
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(contentSnapshot.profile.tagline);
  });

  it("serves case studies from API content", async () => {
    mockApi({ "GET /api/v1/content": () => jsonResponse(200, API_CONTENT) });
    renderApp("/work/brand-new");

    expect(await screen.findByRole("heading", { level: 1, name: "Brand new project" })).toBeInTheDocument();
  });
});


describe("ContentProvider cache", () => {
  it("remembers the last API content and starts from it on the next visit", async () => {
    mockApi({ "GET /api/v1/content": () => jsonResponse(200, API_CONTENT) });
    const first = renderApp("/");
    await screen.findByRole("heading", { level: 1, name: "Edited from the admin dashboard." });
    expect(JSON.parse(localStorage.getItem(CONTENT_CACHE_KEY)!).profile.tagline).toBe(
      "Edited from the admin dashboard.",
    );
    first.unmount();

    // Next visit: the API is slow (never answers here), yet the edited content shows at once.
    mockApi({ "GET /api/v1/content": () => new Promise<Response>(() => {}) });
    renderApp("/");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Edited from the admin dashboard.");
  });

  it("ignores a corrupt cache entry and uses the snapshot", () => {
    localStorage.setItem(CONTENT_CACHE_KEY, '{"profile": null');
    mockApi({ "GET /api/v1/content": () => new Promise<Response>(() => {}) });
    renderApp("/");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(contentSnapshot.profile.tagline);
  });

  it("still works when storage is blocked", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    mockApi({ "GET /api/v1/content": () => jsonResponse(200, API_CONTENT) });
    renderApp("/");

    expect(await screen.findByRole("heading", { level: 1, name: "Edited from the admin dashboard." })).toBeInTheDocument();
    getItem.mockRestore();
    setItem.mockRestore();
  });

  it("doesn't cache a failed response", async () => {
    const fetchMock = mockApi({ "GET /api/v1/content": () => jsonResponse(503, { success: false, message: "x", errors: null }) });
    renderApp("/");

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(localStorage.getItem(CONTENT_CACHE_KEY)).toBeNull();
  });
});
