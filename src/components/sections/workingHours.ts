/**
 * Pure helpers for the contact page's working-hours panel. The backend defines the overlap as
 * 09:00–18:00 working days in each time zone (Kathmandu is UTC+5:45); these helpers only lay
 * those windows out on the visitor's own 24-hour day for the chart. No I/O, fully tested.
 */

export const DAY_MINUTES = 24 * 60;
export const WORK_START_MINUTES = 9 * 60;
export const WORK_END_MINUTES = 18 * 60;
export const KATHMANDU_OFFSET_MINUTES = 5 * 60 + 45;

/** A [start, end) window in minutes of the visitor's local day, 0–1440. */
export type Segment = readonly [number, number];

function normalise(minutes: number): number {
  return ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
}

/** Splits a window that may cross midnight into at most two in-day segments. */
function wrap(start: number, length: number): Segment[] {
  const from = normalise(start);
  const to = from + length;
  return to <= DAY_MINUTES ? [[from, to]] : [[from, DAY_MINUTES], [0, to - DAY_MINUTES]];
}

/** The visitor's own working day on their own clock. */
export function visitorHours(): Segment[] {
  return [[WORK_START_MINUTES, WORK_END_MINUTES]];
}

/** Kathmandu's 09:00–18:00, expressed on the visitor's clock. */
export function myHoursOnVisitorClock(visitorOffsetMinutes: number): Segment[] {
  const shift = visitorOffsetMinutes - KATHMANDU_OFFSET_MINUTES;
  return wrap(WORK_START_MINUTES + shift, WORK_END_MINUTES - WORK_START_MINUTES).sort(
    (a, b) => a[0] - b[0],
  );
}

/** Where the two working days intersect, on the visitor's clock. */
export function overlapSegments(a: Segment[], b: Segment[]): Segment[] {
  const result: Segment[] = [];
  for (const [aStart, aEnd] of a) {
    for (const [bStart, bEnd] of b) {
      const start = Math.max(aStart, bStart);
      const end = Math.min(aEnd, bEnd);
      if (end > start) result.push([start, end]);
    }
  }
  return result.sort((x, y) => x[0] - y[0]);
}

/** "09:00" from minutes since midnight (1440 renders as "24:00"). */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/** "09:00–18:00" or "21:15–24:00 and 00:00–06:15". */
export function describeSegments(segments: Segment[]): string {
  return segments.map(([s, e]) => `${formatMinutes(s)}–${formatMinutes(e)}`).join(" and ");
}
