/** Display helpers for the admin's Pitch history (pure; unit-tested in pitchFormat.test.ts). */
import type { Status } from "../components/ui/StatusDot";
import type { PitchOutcome } from "../lib/cmsContracts";

export interface OutcomeDisplay {
  label: string;
  status: Status;
  /** Extra explanation for outcomes that share a label (the two kinds of failure). */
  detail?: string;
}

const OUTCOMES: Record<PitchOutcome, OutcomeDisplay> = {
  completed: { label: "Completed", status: "done" },
  cached: { label: "Cached", status: "done", detail: "Replayed from the 24-hour cache (free)" },
  timeout: { label: "Timed out", status: "error" },
  upstream_error: { label: "Failed", status: "error", detail: "A provider (Gemini or Tavily) failed" },
  internal_error: { label: "Failed", status: "error", detail: "An unexpected server error" },
  disconnected: { label: "Left early", status: "idle", detail: "The visitor closed the page mid-run" },
};

export function outcomeDisplay(outcome: PitchOutcome): OutcomeDisplay {
  return OUTCOMES[outcome] ?? { label: outcome, status: "idle" };
}

/** Options for the outcome filter, in the order the admin expects to scan them. */
export const OUTCOME_FILTERS: { value: PitchOutcome; label: string }[] = [
  { value: "completed", label: "Completed" },
  { value: "cached", label: "Cached" },
  { value: "timeout", label: "Timed out" },
  { value: "upstream_error", label: "Failed (provider)" },
  { value: "internal_error", label: "Failed (server)" },
  { value: "disconnected", label: "Left early" },
];

export function isPitchOutcome(value: string | null): value is PitchOutcome {
  return value !== null && value in OUTCOMES;
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/** "$0.0082", "$1.50"; "—" when unknown. Small amounts keep up to 4 decimals. */
export function formatUsd(value: number | null | undefined): string {
  return value === null || value === undefined || Number.isNaN(value) ? "—" : usd.format(value);
}

/** "320 ms" under a second, "1.9 s" above. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "5 minutes ago", "yesterday", "just now". */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const seconds = (new Date(iso).getTime() - now.getTime()) / 1000;
  if (Number.isNaN(seconds)) return "";
  if (Math.abs(seconds) < 45) return "just now";
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(Math.round(seconds / 60), "minute");
}

/** Full date and time in the admin's own time zone, e.g. "14 Oct 2026, 13:05". */
export function absoluteTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** "21–40 of 135"; "0 of 0" when empty. */
export function rangeLabel(offset: number, count: number, total: number): string {
  if (total === 0 || count === 0) return `0 of ${total}`;
  return `${offset + 1}–${offset + count} of ${total}`;
}
