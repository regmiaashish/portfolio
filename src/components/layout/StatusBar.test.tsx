import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HEALTH_INTERVAL_MS } from "../../hooks/useApiHealth";
import { StatusBar } from "./StatusBar";

function healthCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([input]) => String(input).endsWith("/health"));
}

function stubHealth(ok = true) {
  const fetchMock = vi.fn(async () => {
    if (!ok) throw new TypeError("Failed to fetch");
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}

afterEach(() => {
  vi.useRealTimers();
  setVisibility("visible");
});

describe("StatusBar", () => {
  it("shows the API latency measured in the browser, with a sparkline summary", async () => {
    // A fake clock that only moves while /health is "in flight": exactly 84 ms.
    let clock = 1000;
    const now = vi.spyOn(performance, "now").mockImplementation(() => clock);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        clock += 84;
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
    render(<StatusBar />);

    expect(await screen.findByText("84 ms")).toBeInTheDocument();
    expect(screen.getByText("api online")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "API latency over the last 1 check: 84 ms" }),
    ).toBeInTheDocument();
    now.mockRestore();
  });

  it("says when the API is offline instead of inventing a number", async () => {
    stubHealth(false);
    render(<StatusBar />);

    expect(await screen.findByText("showing cached content")).toBeInTheDocument();
    expect(screen.getByText("api offline")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /API latency/ })).not.toBeInTheDocument();
  });

  it("checks every 30 s only while the tab is visible", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", undefined); // afterPaint falls back to a timer
    const fetchMock = stubHealth();
    render(<StatusBar />);

    await vi.advanceTimersByTimeAsync(1);
    expect(healthCalls(fetchMock)).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(HEALTH_INTERVAL_MS);
    expect(healthCalls(fetchMock)).toHaveLength(2);

    setVisibility("hidden");
    await vi.advanceTimersByTimeAsync(HEALTH_INTERVAL_MS * 3);
    expect(healthCalls(fetchMock)).toHaveLength(2);

    setVisibility("visible");
    await vi.advanceTimersByTimeAsync(1);
    expect(healthCalls(fetchMock)).toHaveLength(3);
  });

  it("shows Kathmandu time and the number of published projects, and isn't a live region", () => {
    stubHealth();
    render(<StatusBar />);

    const bar = screen.getByRole("complementary", { name: "Live system status" });
    expect(bar).toHaveTextContent(/kathmandu \d{2}:\d{2}/);
    expect(bar).toHaveTextContent(/5 projects live/);
    expect(bar).not.toHaveAttribute("aria-live");
  });
});
