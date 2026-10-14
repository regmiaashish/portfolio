import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FULL_CONTEXT, jsonResponse, mockApi } from "../test/fetch";
import { useVisitorContext } from "./useVisitorContext";

describe("useVisitorContext", () => {
  it("starts loading, then resolves with the context", async () => {
    const fetchMock = mockApi({ "GET /api/v1/context": () => jsonResponse(200, FULL_CONTEXT) });
    const { result } = renderHook(() => useVisitorContext());

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.data).toEqual(FULL_CONTEXT);
    // No query string: the backend derives the visitor's IP itself.
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.test.example/api/v1/context");
  });

  it("reports an error for a failed response", async () => {
    mockApi({
      "GET /api/v1/context": () =>
        jsonResponse(503, { success: false, message: "Unavailable", errors: null }),
    });
    const { result } = renderHook(() => useVisitorContext());

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("reports an error when the network is down", async () => {
    mockApi({});
    const { result } = renderHook(() => useVisitorContext());

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("treats a non-object body as an error", async () => {
    mockApi({ "GET /api/v1/context": () => jsonResponse(200, ["unexpected"]) });
    const { result } = renderHook(() => useVisitorContext());

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("aborts the request on unmount and does not update afterwards", async () => {
    let signal: AbortSignal | undefined;
    mockApi({
      "GET /api/v1/context": (init) => {
        signal = init?.signal ?? undefined;
        return new Promise<Response>(() => {}); // never resolves
      },
    });
    const errorSpy = vi.spyOn(console, "error");
    const { unmount } = renderHook(() => useVisitorContext());

    await waitFor(() => expect(signal).toBeDefined());
    unmount();

    expect(signal?.aborted).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
