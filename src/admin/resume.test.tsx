import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { contentSnapshot } from "../data/snapshot";
import type { SiteContent } from "../lib/cmsContracts";
import { FakeXHR, adminContentFixture, installFakeXHR, mockAdminApi } from "../test/admin";
import { jsonResponse, mockApi } from "../test/fetch";
import { renderApp } from "../test/render";

const RESUME_URL = "https://bucket.s3.ap-south-1.amazonaws.com/portfolio/resume/9b1f.pdf";
const TICKET = {
  url: "https://bucket.s3.ap-south-1.amazonaws.com/",
  fields: { key: "portfolio/resume/9b1f.pdf", "Content-Type": "application/pdf", policy: "p", "x-amz-signature": "s" },
  key: "portfolio/resume/9b1f.pdf",
  public_url: RESUME_URL,
  max_bytes: 5 * 1024 * 1024,
};

const pdf = (size = 4096, name = "Aashish Regmi CV.pdf", type = "application/pdf") =>
  new File([new Uint8Array(size)], name, { type });

beforeEach(() => {
  installFakeXHR();
});

describe("public résumé links", () => {
  it("are hidden while no résumé is set", () => {
    renderApp("/");

    expect(screen.queryByRole("link", { name: "View résumé" })).not.toBeInTheDocument();
  });

  it("point to the /resume page from the hero and the contact page once one is set", async () => {
    const content: SiteContent = {
      ...contentSnapshot,
      profile: { ...contentSnapshot.profile, resume_url: RESUME_URL },
      updated_at: "2026-10-14T10:00:00Z",
    };
    mockApi({ "GET /api/v1/content": () => jsonResponse(200, content) });

    for (const [url, name] of [
      ["/", "View résumé"],
      ["/contact", "Résumé"],
    ] as const) {
      const view = renderApp(url);
      const main = await screen.findByRole("main");
      const link = await within(main).findByRole("link", { name });
      expect(link).toHaveAttribute("href", "/resume");
      expect(link).not.toHaveAttribute("target");
      view.unmount();
    }
  });
});

describe("admin Résumé tab", () => {
  it("uploads a PDF straight to S3 (purpose resume) and saves its URL with the profile", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const { calls } = mockAdminApi({
      "POST /api/v1/admin/uploads": () => jsonResponse(200, TICKET),
      "PUT /api/v1/admin/profile": (init) => jsonResponse(200, JSON.parse(String(init?.body))),
    });
    renderApp("/admin/resume");

    await user.upload(await screen.findByLabelText("Or upload a PDF"), pdf());

    expect(await screen.findByLabelText("Résumé link")).toHaveValue(RESUME_URL);
    expect(calls("POST", "/api/v1/admin/uploads")[0].body).toEqual({
      filename: "Aashish Regmi CV.pdf",
      content_type: "application/pdf",
      size: 4096,
      purpose: "resume",
    });
    const [xhr] = FakeXHR.instances;
    expect([...xhr.body!.keys()].at(-1)).toBe("file"); // S3 requires the file last

    await user.click(screen.getByRole("button", { name: "Save résumé" }));
    await screen.findByText(/Résumé saved/);
    expect(calls("PUT", "/api/v1/admin/profile")[0].body.resume_url).toBe(RESUME_URL);
  });

  it.each([
    ["a non-PDF", pdf(100, "cv.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), /as a PDF/],
    ["an oversize PDF", pdf(5 * 1024 * 1024 + 1), /5 MB or smaller/],
  ])("rejects %s before asking the server", async (_name, file, message) => {
    const user = userEvent.setup({ applyAccept: false });
    const { calls } = mockAdminApi();
    renderApp("/admin/resume");

    await user.upload(await screen.findByLabelText("Or upload a PDF"), file);

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(calls("POST", "/api/v1/admin/uploads")).toHaveLength(0);
  });

  it("accepts a pasted link, validates it, and can remove it", async () => {
    const user = userEvent.setup();
    const content = adminContentFixture();
    const { calls } = mockAdminApi({
      "GET /api/v1/admin/content": () =>
        jsonResponse(200, { ...content, profile: { ...content.profile!, resume_url: RESUME_URL } }),
      "PUT /api/v1/admin/profile": (init) => jsonResponse(200, JSON.parse(String(init?.body))),
    });
    renderApp("/admin/resume");

    const field = await screen.findByLabelText("Résumé link");
    expect(field).toHaveValue(RESUME_URL);

    await user.clear(field);
    await user.type(field, "drive.google.com/cv");
    await user.click(screen.getByRole("button", { name: "Save résumé" }));
    expect(field).toHaveAccessibleDescription(/must start with https:\/\//);
    expect(calls("PUT", "/api/v1/admin/profile")).toHaveLength(0);

    await user.clear(field);
    await user.type(field, "https://drive.google.com/cv");
    await user.click(screen.getByRole("button", { name: "Save résumé" }));
    await screen.findByText(/Résumé saved/);
    expect(calls("PUT", "/api/v1/admin/profile")[0].body.resume_url).toBe("https://drive.google.com/cv");

    await user.click(screen.getByRole("button", { name: "Remove résumé" }));
    expect(field).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Save résumé" }));
    await screen.findAllByText(/Résumé saved/);
    const removal = calls("PUT", "/api/v1/admin/profile").at(-1)!.body;
    expect(removal.resume_url).toBeNull();
    // Only the résumé changes: every other profile field goes back exactly as stored.
    expect({ ...removal, resume_url: undefined }).toEqual({ ...content.profile!, resume_url: undefined });
  });

  it("is a tab in the admin and the Profile editor links to it", async () => {
    mockAdminApi();
    renderApp("/admin/profile");

    const tabs = await screen.findByRole("navigation", { name: "Admin sections" });
    expect(within(tabs).getByRole("link", { name: "Résumé" })).toHaveAttribute("href", "/admin/resume");
    const main = screen.getByRole("main");
    expect(await within(main).findByRole("link", { name: "Résumé" })).toHaveAttribute(
      "href",
      "/admin/resume",
    );
    expect(screen.queryByLabelText("Résumé link")).not.toBeInTheDocument();
  });

  it("asks for a profile first when none is saved", async () => {
    const content = adminContentFixture();
    mockAdminApi({ "GET /api/v1/admin/content": () => jsonResponse(200, { ...content, profile: null }) });
    renderApp("/admin/resume");

    expect(await screen.findByText(/Save your/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Résumé link")).not.toBeInTheDocument();
  });
});
