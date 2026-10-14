import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { API_URL } from "../lib/api";
import { jsonResponse } from "../test/fetch";
import { happyPathEvents, openSseResponse, sseEvent, sseResponse } from "../test/sse";
import { DROPPED_MESSAGE, usePitchStream } from "./usePitchStream";

function stubFetch(impl: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    impl(String(input), init),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function runPitch(company = "Spotify", role = "Backend", token?: string) {
  const hook = renderHook(() => usePitchStream());
  await act(async () => {
    await hook.result.current.start(company, role, token);
  });
  return hook;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("usePitchStream", () => {
  it("streams agents, log lines and tokens to a finished pitch", async () => {
    const fetchMock = stubFetch(() => sseResponse(happyPathEvents()));

    const { result } = await runPitch();
    const state = result.current.state;

    expect(state.status).toBe("done");
    expect(state.text).toBe("Hi Spotify, I build reliable backends.");
    expect(state.agents).toEqual({ researcher: "done", matchmaker: "done", writer: "done" });
    expect(state.log).toEqual([
      { agent: "researcher", message: "Searching for Spotify, Backend" },
      { agent: "matchmaker", message: "Matched 3 projects" },
    ]);
    expect(state.cached).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("calls the contract URL with encoded params and never sends cookies", async () => {
    const fetchMock = stubFetch(() => sseResponse(happyPathEvents()));

    await runPitch("AT&T", "Site reliability / SRE", "tok-123");

    const [url, init] = fetchMock.mock.calls[0];
    const parsed = new URL(String(url));
    expect(`${parsed.origin}${parsed.pathname}`).toBe(`${API_URL}/api/v1/pitch/stream`);
    expect(parsed.searchParams.get("company")).toBe("AT&T");
    expect(parsed.searchParams.get("role")).toBe("Site reliability / SRE");
    expect(parsed.searchParams.get("turnstile_token")).toBe("tok-123");
    expect(init?.credentials).toBe("omit");
  });

  it("omits turnstile_token when there is none", async () => {
    const fetchMock = stubFetch(() => sseResponse(happyPathEvents()));

    await runPitch();

    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.has("turnstile_token")).toBe(false);
  });

  it("decodes multi-byte characters split across network chunks", async () => {
    stubFetch(() => sseResponse(happyPathEvents("Namaste 🙏 from Kathmandu — café"), 3));

    const { result } = await runPitch();

    expect(result.current.state.text).toBe("Namaste 🙏 from Kathmandu — café");
  });

  it("reports a cached replay", async () => {
    stubFetch(() => sseResponse(happyPathEvents("Cached pitch.", true)));

    const { result } = await runPitch();

    expect(result.current.state.cached).toBe(true);
  });

  it("ends with the server's error event and marks the running agent as failed", async () => {
    stubFetch(() =>
      sseResponse([
        sseEvent("agent", { agent: "researcher", status: "running" }),
        sseEvent("error", { code: "timeout", message: "The agents took too long. Please try again." }),
      ]),
    );

    const { result } = await runPitch();

    expect(result.current.state.status).toBe("error");
    expect(result.current.state.error).toEqual({
      code: "timeout",
      message: "The agents took too long. Please try again.",
    });
    expect(result.current.state.agents.researcher).toBe("error");
  });

  it("treats a stream that ends without done as dropped", async () => {
    stubFetch(() =>
      sseResponse([sseEvent("agent", { agent: "writer", status: "running" }), sseEvent("token", { text: "Hi" })]),
    );

    const { result } = await runPitch();

    expect(result.current.state.status).toBe("error");
    expect(result.current.state.error?.message).toBe(DROPPED_MESSAGE);
    expect(result.current.state.text).toBe("Hi");
  });

  it.each([
    [429, { success: false, message: "The demo is resting for today. Try again tomorrow.", errors: { code: "daily_cap" } }, "daily_cap"],
    [503, { success: false, message: "Pitch Me is switched off right now.", errors: { code: "disabled" } }, "disabled"],
    [400, { success: false, message: "Verification failed. Please try again.", errors: null }, undefined],
    [422, { success: false, message: "Request validation failed.", errors: [{ loc: ["query", "company"], msg: "bad", type: "x" }] }, undefined],
  ])("turns HTTP %i into an error with the backend message", async (status, body, code) => {
    stubFetch(() => jsonResponse(status, body));

    const { result } = await runPitch();

    expect(result.current.state.status).toBe("error");
    expect(result.current.state.error).toEqual({ message: body.message, code });
  });

  it("explains a network failure", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));

    const { result } = await runPitch();

    expect(result.current.state.status).toBe("error");
    expect(result.current.state.error?.message).toMatch(/can't reach the server/i);
  });

  it("never retries on its own", async () => {
    const fetchMock = stubFetch(() => jsonResponse(503, { message: "down", errors: { code: "disabled" } }));

    await runPitch();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aborts the request when the component unmounts, without state updates afterwards", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let signal: AbortSignal | null | undefined;
    let open!: ReturnType<typeof openSseResponse>;
    stubFetch((_url, init) => {
      signal = init?.signal;
      open = openSseResponse(init?.signal);
      return open.response;
    });

    const { result, unmount } = renderHook(() => usePitchStream());
    let run!: Promise<void>;
    act(() => {
      run = result.current.start("Spotify", "Backend");
    });
    await waitFor(() => expect(signal).toBeDefined());
    act(() => open.push(sseEvent("agent", { agent: "researcher", status: "running" })));

    unmount();
    await run;

    expect(signal?.aborted).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("cancel() stops the run and returns to idle", async () => {
    let open!: ReturnType<typeof openSseResponse>;
    stubFetch((_url, init) => {
      open = openSseResponse(init?.signal);
      return open.response;
    });

    const { result } = renderHook(() => usePitchStream());
    let run!: Promise<void>;
    act(() => {
      run = result.current.start("Spotify", "Backend");
    });
    await waitFor(() => expect(result.current.state.status).toBe("running"));
    await act(async () => {
      result.current.cancel();
      await run;
    });

    expect(result.current.state.status).toBe("idle");
  });

  it("starting again abandons the previous run", async () => {
    let calls = 0;
    stubFetch((_url, init) => {
      calls += 1;
      if (calls === 1) return openSseResponse(init?.signal).response; // never finishes
      return sseResponse(happyPathEvents("Second run."));
    });

    const { result } = renderHook(() => usePitchStream());
    act(() => {
      void result.current.start("First", "Run");
    });
    await act(async () => {
      await result.current.start("Second", "Run");
    });

    expect(result.current.state.status).toBe("done");
    expect(result.current.state.text).toBe("Second run.");
  });
});
