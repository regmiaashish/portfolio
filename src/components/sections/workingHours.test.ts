import { describe, expect, it } from "vitest";

import {
  describeSegments,
  formatMinutes,
  myHoursOnVisitorClock,
  overlapSegments,
  visitorHours,
} from "./workingHours";

const hours = (h: number, m = 0) => h * 60 + m;

describe("working hours on the visitor's clock", () => {
  it("is identical for a visitor in Kathmandu", () => {
    expect(myHoursOnVisitorClock(345)).toEqual([[hours(9), hours(18)]]);
  });

  it("shifts by the time-zone difference (London, UTC+1)", () => {
    // Kathmandu 09:00 = 03:15 UTC = 04:15 in London (BST).
    expect(myHoursOnVisitorClock(60)).toEqual([[hours(4, 15), hours(13, 15)]]);
    expect(overlapSegments(visitorHours(), myHoursOnVisitorClock(60))).toEqual([
      [hours(9), hours(13, 15)],
    ]);
  });

  it("splits a window that crosses the visitor's midnight (New York, UTC-4)", () => {
    // Kathmandu 09:00–18:00 = 23:15–08:15 in New York.
    expect(myHoursOnVisitorClock(-240)).toEqual([
      [0, hours(8, 15)],
      [hours(23, 15), hours(24)],
    ]);
    expect(overlapSegments(visitorHours(), myHoursOnVisitorClock(-240))).toEqual([]);
  });

  it("finds a small overlap the next morning (Honolulu, UTC-10)", () => {
    expect(overlapSegments(visitorHours(), myHoursOnVisitorClock(-600))).toEqual([
      [hours(17, 15), hours(18)],
    ]);
  });

  it("formats minutes and segments", () => {
    expect(formatMinutes(hours(4, 15))).toBe("04:15");
    expect(formatMinutes(hours(24))).toBe("24:00");
    expect(describeSegments(myHoursOnVisitorClock(-240))).toBe("00:00–08:15 and 23:15–24:00");
  });
});
