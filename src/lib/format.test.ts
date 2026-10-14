import { describe, expect, it } from "vitest";

import type { VisitorContext } from "./contracts";
import {
  buildGreeting,
  cityFromTimezone,
  clockIn,
  formatClock,
  formatHours,
  greetingTags,
  sameTimeZone,
  formatMoney,
  timeOfDay,
  toNumber,
} from "./format";
import { FULL_CONTEXT } from "../test/fetch";

describe("timeOfDay", () => {
  it.each([
    ["2026-10-14T00:00:00+01:00", "morning"],
    ["2026-10-14T11:59:00+01:00", "morning"],
    ["2026-10-14T12:00:00+01:00", "afternoon"],
    ["2026-10-14T17:59:00+05:45", "afternoon"],
    ["2026-10-14T18:00:00-07:00", "evening"],
    ["2026-10-14T23:59:00Z", "evening"],
  ])("%s is %s", (iso, expected) => {
    expect(timeOfDay(iso)).toBe(expected);
  });

  it.each([null, undefined, "", "not a time", "2026-10-14T25:00:00Z"])("%s gives null", (value) => {
    expect(timeOfDay(value)).toBeNull();
  });
});

describe("formatClock", () => {
  it("reads the local clock from the ISO string, not the viewer's timezone", () => {
    expect(formatClock("2026-10-15T01:45:00+05:45")).toBe("01:45");
    expect(formatClock("2026-10-14T19:05:30.123-04:00")).toBe("19:05");
  });

  it("returns null for garbage", () => {
    expect(formatClock("yesterday")).toBeNull();
    expect(formatClock(null)).toBeNull();
  });
});

describe("clockIn", () => {
  it("handles half-and-quarter-hour zones like Nepal (UTC+5:45)", () => {
    expect(clockIn("Asia/Kathmandu", new Date("2026-10-14T20:00:00Z"))).toBe("01:45");
  });

  it("returns null for an unknown timezone", () => {
    expect(clockIn("Mars/Olympus_Mons")).toBeNull();
  });
});

describe("formatMoney and toNumber", () => {
  it("formats whole units with the narrow symbol", () => {
    expect(formatMoney(45, "GBP")).toBe("£45");
    expect(formatMoney("57.15", "USD")).toBe("$57");
    expect(formatMoney(4800.4, "INR")).toBe("₹4,800");
  });

  it("accepts Decimal values serialised as strings", () => {
    expect(toNumber("45.50")).toBe(45.5);
    expect(toNumber("abc")).toBeNull();
    expect(toNumber("")).toBeNull();
  });

  it("falls back to the backend's symbol for an unknown currency code", () => {
    expect(formatMoney(10, "XQZZ", "¤")).toBe("¤10");
    expect(formatMoney(10, "XQZZ")).toBe("10 XQZZ");
  });

  it("returns null when amount or currency is missing", () => {
    expect(formatMoney(null, "GBP")).toBeNull();
    expect(formatMoney(5, null)).toBeNull();
  });
});

describe("small helpers", () => {
  it("formats hours to the nearest half", () => {
    expect(formatHours(3)).toBe("3 hours");
    expect(formatHours(1)).toBe("1 hour");
    expect(formatHours(2.25)).toBe("2.5 hours");
  });

  it("derives a city from a timezone", () => {
    expect(cityFromTimezone("Asia/Kathmandu")).toBe("Kathmandu");
    expect(cityFromTimezone("America/Los_Angeles")).toBe("Los Angeles");
    expect(cityFromTimezone(null)).toBeNull();
  });
});

describe("buildGreeting", () => {
  const ctx = (overrides: Partial<VisitorContext> = {}): VisitorContext => ({
    ...FULL_CONTEXT,
    ...overrides,
  });

  it("builds the full greeting", () => {
    expect(buildGreeting(ctx(), "Kathmandu")).toEqual({
      primary: "Good evening in London. It's light rain and 18°C where you are.",
      secondary:
        "I'm in Kathmandu, where it's 01:45, so our working days overlap by about 3 hours. " +
        "My rate is £45/hour (about $57).",
    });
  });

  it("skips the weather when it is missing", () => {
    const greeting = buildGreeting(ctx({ weather: null }), "Kathmandu");
    expect(greeting?.primary).toBe("Good evening in London.");
  });

  it("uses only the temperature when there is no description", () => {
    const greeting = buildGreeting(
      ctx({ weather: { temperature_c: 4.6, description: null } }),
      "Kathmandu",
    );
    expect(greeting?.primary).toBe("Good evening in London. It's 5°C where you are.");
  });

  it("explains when working days don't overlap", () => {
    const greeting = buildGreeting(ctx({ timezone_overlap_hours: 0 }), "Kathmandu");
    expect(greeting?.secondary).toContain(
      "and our working days don't overlap, so I reply asynchronously.",
    );
  });

  it("omits the overlap clause when it is unknown", () => {
    const greeting = buildGreeting(
      ctx({ timezone_overlap_hours: null, hourly_rate_gbp: null }),
      "Kathmandu",
    );
    expect(greeting?.secondary).toBe("I'm in Kathmandu, where it's 01:45.");
  });

  it("does not convert the rate for a GBP visitor", () => {
    const greeting = buildGreeting(
      ctx({ currency_code: "GBP", currency_symbol: "£", hourly_rate_local: 45 }),
      "Kathmandu",
    );
    expect(greeting?.secondary).toContain("My rate is £45/hour.");
    expect(greeting?.secondary).not.toContain("(about");
  });

  it("never renders null, undefined or NaN for sparse data", () => {
    const sparse: VisitorContext = { city: "Pokhara", my_timezone: "Asia/Kathmandu" };
    const greeting = buildGreeting(sparse, "Kathmandu");
    expect(greeting).toEqual({ primary: "Hello to you in Pokhara.", secondary: "I'm in Kathmandu." });
    expect(JSON.stringify(greeting)).not.toMatch(/null|undefined|NaN/);
  });

  it("returns null when there is nothing personal to say", () => {
    expect(buildGreeting({}, "Kathmandu")).toBeNull();
    expect(buildGreeting(null, "Kathmandu")).toBeNull();
    // The old backend's shape: no local_time, but a city: still greets by city.
    expect(buildGreeting({ city: "Paris" }, "Kathmandu")?.primary).toBe("Hello to you in Paris.");
  });
});

describe("greetingTags", () => {
  it("builds console tags from the visitor's context", () => {
    expect(greetingTags(FULL_CONTEXT)).toEqual(["london", "19:30 local", "3h overlap"]);
  });

  it("reports no overlap and skips missing fields", () => {
    expect(
      greetingTags({ ...FULL_CONTEXT, city: null, local_time: null, timezone_overlap_hours: 0 }),
    ).toEqual(["no overlap"]);
    expect(greetingTags({ ...FULL_CONTEXT, timezone_overlap_hours: 2.3 })).toContain("2.5h overlap");
    expect(greetingTags(null)).toEqual([]);
  });
});

describe("same time zone", () => {
  const kathmandu = {
    city: "Kathmandu",
    local_time: "2026-10-14T21:50:00+05:45",
    my_timezone: "Asia/Kathmandu",
    my_local_time: "2026-10-14T21:50:00+05:45",
    timezone_overlap_hours: 9,
    weather: { description: "clear skies", temperature_c: 18 },
  } as VisitorContext;

  it("says 'too' instead of an overlap for a visitor in my city", () => {
    const greeting = buildGreeting(kathmandu, "Kathmandu");

    expect(greeting?.secondary).toBe("I'm in Kathmandu too, so we share the whole working day.");
    expect(greeting?.secondary).not.toContain("overlap");
    expect(greetingTags(kathmandu)).toContain("same time zone");
    expect(greetingTags(kathmandu).join(" ")).not.toContain("9h overlap");
  });

  it("says 'same time zone' for another city on my clock", () => {
    const pokhara = { ...kathmandu, city: "Pokhara" } as VisitorContext;

    expect(buildGreeting(pokhara, "Kathmandu")?.secondary).toBe(
      "We're in the same time zone, so we share the whole working day.",
    );
  });

  it("keeps the overlap wording when offsets differ", () => {
    const london = {
      ...kathmandu,
      city: "London",
      local_time: "2026-10-14T17:05:00+01:00",
      timezone_overlap_hours: 4.5,
    } as VisitorContext;

    expect(sameTimeZone(london)).toBe(false);
    expect(buildGreeting(london, "Kathmandu")?.secondary).toContain("overlap by about 4.5 hours");
  });

  it("treats Z and +00:00 as the same offset", () => {
    expect(
      sameTimeZone({ local_time: "2026-01-01T10:00:00Z", my_local_time: "2026-01-01T15:45:00+00:00" } as VisitorContext),
    ).toBe(true);
  });
});
