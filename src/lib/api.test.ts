import { afterEach, describe, expect, it, vi } from "vitest";

import { API_URL, ApiError, request } from "./api";

function mockFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request", () => {
  it("joins the base URL and path and returns parsed JSON", async () => {
    const fetchMock = mockFetch(async () => json(200, { status: "ok" }));

    await expect(request("/health")).resolves.toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/health`, expect.any(Object));
    expect(API_URL).toBe("https://api.test.example");
  });

  it("sends JSON bodies without cookies by default", async () => {
    const fetchMock = mockFetch(async () => json(200, { success: true }));

    await request("/api/v1/contact", { method: "POST", body: { name: "A" } });

    const init = fetchMock.mock.calls[0][1]!;
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "A" }));
    expect(init.credentials).toBe("omit");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("includes cookies only when asked", async () => {
    const fetchMock = mockFetch(async () => json(200, {}));

    await request("/api/v1/auth/me", { withCredentials: true });

    expect(fetchMock.mock.calls[0][1]!.credentials).toBe("include");
  });

  it("uses the backend's message from the standard error body", async () => {
    mockFetch(async () =>
      json(422, {
        success: false,
        message: "Request validation failed.",
        errors: [{ loc: ["body", "email"], msg: "invalid", type: "value_error" }],
      }),
    );

    const error = await request("/api/v1/contact").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, message: "Request validation failed." });
    expect((error as ApiError).errors).toHaveLength(1);
  });

  it("understands the legacy {detail} body from the old backend", async () => {
    mockFetch(async () => json(404, { detail: "Not Found" }));

    await expect(request("/x")).rejects.toMatchObject({ status: 404, message: "Not Found" });
  });

  it("falls back to a friendly message for non-JSON errors", async () => {
    mockFetch(async () => new Response("<html>Bad gateway</html>", { status: 502 }));

    await expect(request("/x")).rejects.toMatchObject({
      status: 502,
      message: "Something went wrong on our side. Please try again later.",
    });
  });

  it("explains rate limiting even without a body", async () => {
    mockFetch(async () => new Response(null, { status: 429 }));

    await expect(request("/x")).rejects.toMatchObject({ status: 429 });
  });

  it("resolves 204 No Content to undefined", async () => {
    mockFetch(async () => new Response(null, { status: 204 }));

    await expect(request("/api/v1/admin/projects/1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("turns network failures into an ApiError with status 0", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });

    const error = (await request("/x").catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.isNetworkError).toBe(true);
  });

  it("rethrows aborts untouched so callers can ignore them", async () => {
    mockFetch(async () => {
      throw new DOMException("aborted", "AbortError");
    });

    await expect(request("/x")).rejects.toMatchObject({ name: "AbortError" });
  });
});
