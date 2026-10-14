import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeXHR, installFakeXHR, mockAdminApi } from "../test/admin";
import { optimiseImage } from "./images";
import { jsonResponse } from "../test/fetch";
import { renderApp } from "../test/render";

// jsdom can't decode or re-encode images; by default the picked file is uploaded as is.
vi.mock("./images", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./images")>();
  return {
    ...actual,
    optimiseImage: vi.fn(async (file: File) => ({ file, width: 1200, height: 750, changed: false })),
  };
});

const TICKET = {
  url: "https://portfolio-bucket.s3.amazonaws.com/",
  fields: {
    key: "portfolio/projects/3f2a.png",
    "Content-Type": "image/png",
    policy: "eyJleHBpcmF0aW9uIjoi...",
    "x-amz-signature": "abc123",
  },
  key: "portfolio/projects/3f2a.png",
  public_url: "https://portfolio-bucket.s3.amazonaws.com/portfolio/projects/3f2a.png",
  max_bytes: 5 * 1024 * 1024,
};

function png(size = 2048, name = "screenshot.png", type = "image/png") {
  return new File([new Uint8Array(size)], name, { type });
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("Name"), "Image project");
  await user.type(screen.getByLabelText("Category"), "Web app");
  await user.type(screen.getByLabelText("Summary"), "Has a screenshot.");
}

beforeEach(() => {
  installFakeXHR();
  vi.mocked(optimiseImage).mockClear();
});

describe("image upload", () => {
  it("presigns, uploads straight to S3 (fields before file) and saves the key with the size", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const { calls } = mockAdminApi({
      "POST /api/v1/admin/uploads": () => jsonResponse(200, TICKET),
      "POST /api/v1/admin/projects": () => jsonResponse(201, {}),
    });
    renderApp("/admin/projects/new");
    await fillRequiredFields(user);

    await user.upload(screen.getByLabelText("Upload an image"), png());

    const preview = await screen.findByRole("img", { name: "Uploaded image preview" });
    expect(preview).toHaveAttribute("src", TICKET.public_url);

    const [presign] = calls("POST", "/api/v1/admin/uploads");
    expect(presign.body).toEqual({
      filename: "screenshot.png",
      content_type: "image/png",
      size: 2048,
      purpose: "project_image",
    });
    expect(presign.headers["X-Requested-With"]).toBe("portfolio-admin");

    expect(FakeXHR.instances).toHaveLength(1);
    const [xhr] = FakeXHR.instances;
    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe(TICKET.url);
    const names = [...xhr.body!.keys()];
    expect(names).toEqual([...Object.keys(TICKET.fields), "file"]); // S3 requires file last
    expect((xhr.body!.get("file") as File).name).toBe("screenshot.png");

    await user.type(screen.getByLabelText("Alt text"), "The dashboard home screen");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    await screen.findByText(/Saved “Image project”/);
    expect(calls("POST", "/api/v1/admin/projects")[0].body.image).toEqual({
      key: TICKET.key,
      alt: "The dashboard home screen",
      width: 1200,
      height: 750,
    });
  });

  it("uploads the optimised WebP (type, size, name and dimensions) when it's smaller", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const webp = new File([new Uint8Array(900_000)], "camera.webp", { type: "image/webp" });
    vi.mocked(optimiseImage).mockResolvedValueOnce({
      file: webp,
      width: 1600,
      height: 1200,
      changed: true,
    });
    const { calls } = mockAdminApi({
      "POST /api/v1/admin/uploads": () =>
        jsonResponse(200, { ...TICKET, key: "portfolio/projects/3f2a.webp" }),
    });
    renderApp("/admin/projects/new");
    await fillRequiredFields(user);

    // A 7 MB camera JPEG is over the 5 MB upload limit until it has been optimised.
    await user.upload(
      screen.getByLabelText("Upload an image"),
      png(7 * 1024 * 1024, "camera.jpg", "image/jpeg"),
    );

    expect(await screen.findByText(/Optimised for the web: 1600×1200 WebP, 7.0 MB → 879 KB/)).toBeInTheDocument();
    expect(calls("POST", "/api/v1/admin/uploads")[0].body).toEqual({
      filename: "camera.webp",
      content_type: "image/webp",
      size: 900_000,
      purpose: "project_image",
    });
    expect((FakeXHR.instances[0].body!.get("file") as File).type).toBe("image/webp");
  });

  it("rejects an image too large to process, before decoding it", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const { calls } = mockAdminApi();
    renderApp("/admin/projects/new");

    await user.upload(
      await screen.findByLabelText("Upload an image"),
      png(31 * 1024 * 1024, "huge.jpg", "image/jpeg"),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/too large to process/);
    expect(optimiseImage).not.toHaveBeenCalled();
    expect(calls("POST", "/api/v1/admin/uploads")).toHaveLength(0);
  });

  it("requires alt text once an image is attached", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const { calls } = mockAdminApi({ "POST /api/v1/admin/uploads": () => jsonResponse(200, TICKET) });
    renderApp("/admin/projects/new");
    await fillRequiredFields(user);

    await user.upload(screen.getByLabelText("Upload an image"), png());
    await screen.findByRole("img", { name: "Uploaded image preview" });
    await user.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => expect(screen.getByLabelText("Alt text")).toHaveAccessibleDescription(/required/));
    expect(calls("POST", "/api/v1/admin/projects")).toHaveLength(0);
  });

  it.each([
    ["a wrong file type", png(100, "logo.svg", "image/svg+xml"), /PNG, JPEG, WebP or AVIF/],
    ["an oversize file", png(5 * 1024 * 1024 + 1), /5 MB or smaller/],
  ])("rejects %s before asking the server", async (_name, file, message) => {
    const user = userEvent.setup({ applyAccept: false });
    const { calls } = mockAdminApi();
    renderApp("/admin/projects/new");

    await user.upload(await screen.findByLabelText("Upload an image"), file);

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(calls("POST", "/api/v1/admin/uploads")).toHaveLength(0);
    expect(FakeXHR.instances).toHaveLength(0);
  });

  it("explains when uploads aren't configured on the server", async () => {
    const user = userEvent.setup({ applyAccept: false });
    mockAdminApi({
      "POST /api/v1/admin/uploads": () =>
        jsonResponse(503, {
          success: false,
          message: "Uploads are disabled.",
          errors: { code: "uploads_disabled" },
        }),
    });
    renderApp("/admin/projects/new");

    await user.upload(await screen.findByLabelText("Upload an image"), png());

    expect(await screen.findByRole("alert")).toHaveTextContent(/aren't configured on the server/);
  });

  it("reports an upload rejected by S3", async () => {
    const user = userEvent.setup({ applyAccept: false });
    mockAdminApi({ "POST /api/v1/admin/uploads": () => jsonResponse(200, TICKET) });
    FakeXHR.status = 403;
    renderApp("/admin/projects/new");

    await user.upload(await screen.findByLabelText("Upload an image"), png());

    expect(await screen.findByRole("alert")).toHaveTextContent(/rejected by S3 \(HTTP 403\)/);
    expect(screen.queryByRole("img", { name: "Uploaded image preview" })).not.toBeInTheDocument();
  });
});

describe("s3RejectionMessage", () => {
  it("names S3's error code and the likely fix", async () => {
    const { s3RejectionMessage } = await import("./api");
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?><Error><Code>AccessDenied</Code><Message>Access Denied</Message></Error>';

    const message = s3RejectionMessage(403, xml);

    expect(message).toContain("AccessDenied (Access Denied)");
    expect(message).toContain("s3:PutObject");
  });

  it("explains a region mismatch", async () => {
    const { s3RejectionMessage } = await import("./api");

    expect(s3RejectionMessage(301, "<Error><Code>PermanentRedirect</Code></Error>")).toContain(
      "AWS_REGION",
    );
  });

  it("falls back to the status when S3 sends no XML", async () => {
    const { s3RejectionMessage } = await import("./api");

    expect(s3RejectionMessage(500, "")).toBe(
      "The upload was rejected by S3 (HTTP 500). Please try again.",
    );
  });
});
