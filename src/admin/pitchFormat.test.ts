import { describe, expect, it } from "vitest";

import { pitchListParams } from "./api";
import {
  formatDuration,
  formatUsd,
  isPitchOutcome,
  outcomeDisplay,
  rangeLabel,
  relativeTime,
} from "./pitchFormat";

describe("outcomeDisplay", () => {
  it("maps both failure kinds to 'Failed' with different details", () => {
    const upstream = outcomeDisplay("upstream_error");
    const internal = outcomeDisplay("internal_error");

    expect(upstream).toMatchObject({ label: "Failed", status: "error" });
    expect(internal).toMatchObject({ label: "Failed", status: "error" });
    expect(upstream.detail).not.toBe(internal.detail);
  });

  it.each([
    ["completed", "Completed", "done"],
    ["cached", "Cached", "done"],
    ["timeout", "Timed out", "error"],
    ["disconnected", "Left early", "idle"],
  ] as const)("%s → %s", (outcome, label, status) => {
    expect(outcomeDisplay(outcome)).toMatchObject({ label, status });
  });

  it("recognises only real outcomes", () => {
    expect(isPitchOutcome("timeout")).toBe(true);
    expect(isPitchOutcome("failed")).toBe(false);
    expect(isPitchOutcome(null)).toBe(false);
  });
});

describe("formatUsd", () => {
  it("keeps up to four decimals for small amounts", () => {
    expect(formatUsd(0.0082)).toBe("$0.0082");
    expect(formatUsd(0.0164)).toBe("$0.0164");
  });

  it("shows at least two decimals", () => {
    expect(formatUsd(1.5)).toBe("$1.50");
    expect(formatUsd(0)).toBe("$0.00");
  });

  it("shows a dash when unknown", () => {
    expect(formatUsd(null)).toBe("—");
    expect(formatUsd(undefined)).toBe("—");
  });
});

describe("formatDuration", () => {
  it("uses ms under a second and seconds above", () => {
    expect(formatDuration(320)).toBe("320 ms");
    expect(formatDuration(1853)).toBe("1.9 s");
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-10-14T12:00:00Z");

  it("says 'just now' for the last few seconds", () => {
    expect(relativeTime("2026-10-14T11:59:50Z", now)).toBe("just now");
  });

  it("uses the largest fitting unit", () => {
    expect(relativeTime("2026-10-14T11:55:00Z", now)).toMatch(/5 minutes ago/);
    expect(relativeTime("2026-10-14T09:00:00Z", now)).toMatch(/3 hours ago/);
    expect(relativeTime("2026-10-13T12:00:00Z", now)).toMatch(/yesterday/);
  });
});

describe("rangeLabel", () => {
  it("formats the visible window", () => {
    expect(rangeLabel(20, 20, 135)).toBe("21–40 of 135");
    expect(rangeLabel(120, 15, 135)).toBe("121–135 of 135");
  });

  it("handles an empty list", () => {
    expect(rangeLabel(0, 0, 0)).toBe("0 of 0");
  });
});

describe("pitchListParams", () => {
  it("leaves out an empty search and filter", () => {
    expect(pitchListParams({ limit: 20, offset: 0, q: "  ", outcome: undefined })).toBe("limit=20&offset=0");
  });

  it("trims the search and includes the filter", () => {
    const params = new URLSearchParams(pitchListParams({ limit: 20, offset: 40, q: " Spotify ", outcome: "cached" }));
    expect(Object.fromEntries(params)).toEqual({ limit: "20", offset: "40", q: "Spotify", outcome: "cached" });
  });
});
