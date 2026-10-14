import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeXHR, installFakeXHR, mockAdminApi } from "../test/admin";
import { jsonResponse } from "../test/fetch";
import { renderApp } from "../test/render";

// jsdom can't decode images; the browser reads the real size.
vi.mock("./images", () => ({
  readImageSize: vi.fn(async () => ({ width: 1200, height: 750 })),
}));

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
    expect(presign.body).toEqual({ filename: "screenshot.png", content_type: "image/png", size: 2048 });
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

    expect(await screen.findByRole("alert")).toHaveTextContent(/rejected \(HTTP 403\)/);
    expect(screen.queryByRole("img", { name: "Uploaded image preview" })).not.toBeInTheDocument();
  });
});
