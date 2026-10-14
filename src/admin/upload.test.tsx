import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FakeXHR, UPLOADED_IMAGE, installFakeXHR, mockAdminApi } from "../test/admin";
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

afterEach(() => {
  vi.restoreAllMocks(); // undo per-test spies such as the gated XHR send
});

const UPLOAD_URL = "https://api.test.example/api/v1/admin/uploads/file";

describe("image upload", () => {
  it("uploads through the API (credentials, CSRF header, purpose then file) and saves the key", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const { calls, fetchMock } = mockAdminApi({
      "POST /api/v1/admin/projects": () => jsonResponse(201, {}),
    });
    renderApp("/admin/projects/new");
    await fillRequiredFields(user);

    await user.upload(screen.getByLabelText("Upload an image"), png());

    const preview = await screen.findByRole(
      "img",
      { name: "Uploaded image preview" },
      { timeout: 5_000 },
    );
    expect(preview).toHaveAttribute("src", UPLOADED_IMAGE.public_url);

    expect(FakeXHR.instances).toHaveLength(1);
    const [xhr] = FakeXHR.instances;
    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe(UPLOAD_URL);
    expect(xhr.withCredentials).toBe(true);
    expect(xhr.headers["X-Requested-With"]).toBe("portfolio-admin");
    expect([...xhr.body!.keys()]).toEqual(["purpose", "file"]);
    expect(xhr.body!.get("purpose")).toBe("project_image");
    expect((xhr.body!.get("file") as File).name).toBe("screenshot.png");
    // Nothing goes to S3 from the browser, and the old presign endpoint is unused.
    const urls = [...fetchMock.mock.calls.map(([input]) => String(input)), xhr.url];
    expect(urls.some((url) => url.includes("amazonaws.com"))).toBe(false);
    expect(calls("POST", "/api/v1/admin/uploads")).toHaveLength(0);

    await user.type(screen.getByLabelText("Alt text"), "The dashboard home screen");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    await screen.findByText(/Saved “Image project”/, undefined, { timeout: 5_000 });
    expect(calls("POST", "/api/v1/admin/projects")[0].body.image).toEqual({
      key: UPLOADED_IMAGE.key,
      alt: "The dashboard home screen",
      width: 1200,
      height: 750,
    });
    // Long by nature (fills a whole form): generous limit so a busy CI machine can't flake it.
  }, 20_000);

  it("shows upload progress while the file is sent", async () => {
    const user = userEvent.setup({ applyAccept: false });
    mockAdminApi();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(FakeXHR.prototype, "send").mockImplementation(function (this: FakeXHR, body: FormData) {
      this.body = body;
      FakeXHR.instances.push(this);
      this.upload.onprogress?.({ lengthComputable: true, loaded: 4, total: 10 });
      void gate.then(() => {
        this.status = 201;
        this.responseText = JSON.stringify(UPLOADED_IMAGE);
        this.onload?.();
      });
    });
    renderApp("/admin/projects/new");

    await user.upload(await screen.findByLabelText("Upload an image"), png());

    const bar = (await screen.findByLabelText("Upload progress")) as HTMLProgressElement;
    expect(bar.value).toBeCloseTo(0.4);
    release();
    await screen.findByRole("img", { name: "Uploaded image preview" });
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
    FakeXHR.responseBody = { ...UPLOADED_IMAGE, key: "portfolio/projects/3f2a.webp" };
    mockAdminApi();
    renderApp("/admin/projects/new");
    await fillRequiredFields(user);

    // A 7 MB camera JPEG is over the 5 MB upload limit until it has been optimised.
    await user.upload(
      screen.getByLabelText("Upload an image"),
      png(7 * 1024 * 1024, "camera.jpg", "image/jpeg"),
    );

    expect(await screen.findByText(/Optimised for the web: 1600×1200 WebP, 7.0 MB → 879 KB/)).toBeInTheDocument();
    const file = FakeXHR.instances[0].body!.get("file") as File;
    expect(file.type).toBe("image/webp");
    expect(file.name).toBe("camera.webp");
    expect(file.size).toBe(900_000);
  });

  it("rejects an image too large to process, before decoding it", async () => {
    const user = userEvent.setup({ applyAccept: false });
    mockAdminApi();
    renderApp("/admin/projects/new");

    await user.upload(
      await screen.findByLabelText("Upload an image"),
      png(31 * 1024 * 1024, "huge.jpg", "image/jpeg"),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/too large to process/);
    expect(optimiseImage).not.toHaveBeenCalled();
    expect(FakeXHR.instances).toHaveLength(0);
  });

  it("requires alt text once an image is attached", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const { calls } = mockAdminApi();
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
    mockAdminApi();
    renderApp("/admin/projects/new");

    await user.upload(await screen.findByLabelText("Upload an image"), file);

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(FakeXHR.instances).toHaveLength(0);
  });

  it("explains when uploads aren't configured on the server (503 uploads_disabled)", async () => {
    const user = userEvent.setup({ applyAccept: false });
    mockAdminApi();
    FakeXHR.status = 503;
    FakeXHR.responseBody = {
      success: false,
      message: "Uploads are not configured.",
      errors: { code: "uploads_disabled" },
    };
    renderApp("/admin/projects/new");

    await user.upload(await screen.findByLabelText("Upload an image"), png());

    expect(await screen.findByRole("alert")).toHaveTextContent(/aren't configured on the server/);
  });

  it("shows the server's field error for a rejected file (422 on file)", async () => {
    const user = userEvent.setup({ applyAccept: false });
    mockAdminApi();
    FakeXHR.status = 422;
    FakeXHR.responseBody = {
      success: false,
      message: "Request validation failed.",
      errors: [
        { loc: ["body", "file"], msg: "Value error, The file isn't a PNG, JPEG, WebP or AVIF image.", type: "value_error" },
      ],
    };
    renderApp("/admin/projects/new");

    await user.upload(await screen.findByLabelText("Upload an image"), png());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The file isn't a PNG, JPEG, WebP or AVIF image.");
    expect(alert).not.toHaveTextContent("Value error");
    expect(screen.queryByRole("img", { name: "Uploaded image preview" })).not.toBeInTheDocument();
  });

  it("refreshes an expired session once and retries the upload", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const { calls } = mockAdminApi({
      "POST /api/v1/auth/refresh": () => jsonResponse(200, { success: true, message: "ok", data: null }),
    });
    FakeXHR.queue = [
      { status: 401, body: { success: false, message: "Invalid or expired token.", errors: null } },
      { status: 201, body: UPLOADED_IMAGE },
    ];
    renderApp("/admin/projects/new");

    await user.upload(await screen.findByLabelText("Upload an image"), png());

    await screen.findByRole("img", { name: "Uploaded image preview" });
    expect(FakeXHR.instances).toHaveLength(2);
    expect(calls("POST", "/api/v1/auth/refresh")).toHaveLength(1);
  });

  it("explains a network failure without mentioning bucket CORS", async () => {
    const user = userEvent.setup({ applyAccept: false });
    mockAdminApi();
    FakeXHR.networkError = true;
    renderApp("/admin/projects/new");

    await user.upload(await screen.findByLabelText("Upload an image"), png());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("couldn't reach the server");
    expect(alert).not.toHaveTextContent(/CORS|S3/);
  });
});
