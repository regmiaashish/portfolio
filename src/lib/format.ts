/**
 * Pure formatting helpers for the visitor greeting. No React, no I/O: every branch is
 * unit-tested in format.test.ts. Anything missing or malformed is skipped, never
 * rendered as "null" or "undefined".
 */
import type { VisitorContext } from "./contracts";

export type TimeOfDay = "morning" | "afternoon" | "evening";

const CLOCK = /T(\d{2}):(\d{2})/;

/** Hour and minute as written in an ISO timestamp (already in that place's local time). */
function clockParts(iso: string | null | undefined): [number, number] | null {
  const match = iso ? CLOCK.exec(iso) : null;
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return [hour, minute];
}

export function timeOfDay(iso: string | null | undefined): TimeOfDay | null {
  const parts = clockParts(iso);
  if (!parts) return null;
  const [hour] = parts;
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/** "01:45" (24-hour) from an ISO timestamp's own local time. */
export function formatClock(iso: string | null | undefined): string | null {
  const parts = clockParts(iso);
  if (!parts) return null;
  return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

/** The current time in a timezone as "HH:MM", computed in the browser (no API needed). */
export function clockIn(timeZone: string, now: Date = new Date()): string | null {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(now);
  } catch {
    return null;
  }
}

export function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

/** "£45", "$57", "₹4,800": whole units, the currency's narrow symbol. */
export function formatMoney(
  amount: number | string | null | undefined,
  currencyCode: string | null | undefined,
  fallbackSymbol?: string | null,
): string | null {
  const value = toNumber(amount);
  if (value === null || !currencyCode) return null;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currencyCode,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(value);
  } catch {
    // Unknown currency code: fall back to the symbol the backend sent.
    const rounded = Math.round(value).toLocaleString("en-GB");
    return fallbackSymbol ? `${fallbackSymbol}${rounded}` : `${rounded} ${currencyCode}`;
  }
}

/** "3 hours", "1 hour", "2.5 hours". */
export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 2) / 2;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} ${rounded === 1 ? "hour" : "hours"}`;
}

/** "Asia/Kathmandu" -> "Kathmandu". */
export function cityFromTimezone(timeZone: string | null | undefined): string | null {
  if (!timeZone) return null;
  const last = timeZone.split("/").pop();
  return last ? last.replace(/_/g, " ") : null;
}

function weatherClause(context: VisitorContext): string | null {
  const description = context.weather?.description?.trim();
  const temperature = toNumber(context.weather?.temperature_c);
  const degrees = temperature === null ? null : `${Math.round(temperature)}°C`;
  if (description && degrees) return `It's ${description} and ${degrees} where you are.`;
  if (description) return `It's ${description} where you are.`;
  if (degrees) return `It's ${degrees} where you are.`;
  return null;
}

function rateSentence(context: VisitorContext): string | null {
  const gbp = formatMoney(context.hourly_rate_gbp, "GBP", "£");
  if (!gbp) return null;
  const currency = context.currency_code?.toUpperCase();
  const local =
    currency && currency !== "GBP"
      ? formatMoney(context.hourly_rate_local, currency, context.currency_symbol)
      : null;
  return local ? `My rate is ${gbp}/hour (about ${local}).` : `My rate is ${gbp}/hour.`;
}

export interface Greeting {
  primary: string;
  secondary: string | null;
}

const UTC_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/;

function offsetOf(iso: string | null | undefined): string | null {
  const match = iso ? UTC_OFFSET.exec(iso.trim()) : null;
  if (!match) return null;
  return match[1] === "Z" ? "+00:00" : match[1].replace(/^([+-]\d{2})(\d{2})$/, "$1:$2");
}

/** True when the visitor's clock and mine have the same UTC offset right now. */
export function sameTimeZone(context: VisitorContext | null | undefined): boolean {
  if (!context) return false;
  const theirs = offsetOf(context.local_time);
  const mine = offsetOf(context.my_local_time);
  return theirs !== null && theirs === mine;
}

/**
 * Builds the hero greeting from whatever context is available.
 * Returns null when there is nothing personal to say (the caller shows the generic greeting).
 */
export function buildGreeting(context: VisitorContext | null | undefined, myCity: string): Greeting | null {
  if (!context || typeof context !== "object") return null;

  const city = context.city?.trim() || null;
  const period = timeOfDay(context.local_time);
  let opener: string | null = null;
  if (period && city) opener = `Good ${period} in ${city}.`;
  else if (period) opener = `Good ${period}.`;
  else if (city) opener = `Hello to you in ${city}.`;

  const weather = weatherClause(context);
  if (!opener && !weather) return null;
  const primary = [opener ?? "Hello.", weather].filter(Boolean).join(" ");

  const me = cityFromTimezone(context.my_timezone) ?? myCity;
  const myClock = formatClock(context.my_local_time);
  const overlap = toNumber(context.timezone_overlap_hours);
  if (sameTimeZone(context)) {
    // "We overlap 9 hours" is odd when we share a clock; say so plainly instead.
    const together =
      city && city.toLowerCase() === me.toLowerCase()
        ? `I'm in ${me} too, so we share the whole working day.`
        : "We're in the same time zone, so we share the whole working day.";
    return { primary, secondary: [together, rateSentence(context)].filter(Boolean).join(" ") };
  }
  let location = myClock ? `I'm in ${me}, where it's ${myClock}` : `I'm in ${me}`;
  if (overlap !== null && overlap > 0) {
    location += `, so our working days overlap by about ${formatHours(overlap)}.`;
  } else if (overlap !== null) {
    location += `, and our working days don't overlap, so I reply asynchronously.`;
  } else {
    location += ".";
  }

  const secondary = [location, rateSentence(context)].filter(Boolean).join(" ");
  return { primary, secondary };
}

/**
 * Short telemetry tags for the greeting's console line, e.g. ["london", "19:30 local",
 * "3h overlap"]. Only fields that are present produce a tag; never "null" or "NaN".
 */
export function greetingTags(context: VisitorContext | null | undefined): string[] {
  if (!context || typeof context !== "object") return [];
  const tags: string[] = [];
  const city = context.city?.trim();
  if (city) tags.push(city.toLowerCase());
  const clock = formatClock(context.local_time);
  if (clock) tags.push(`${clock} local`);
  const overlap = toNumber(context.timezone_overlap_hours);
  if (sameTimeZone(context)) {
    tags.push("same time zone");
  } else if (overlap !== null) {
    const rounded = Math.round(overlap * 2) / 2;
    tags.push(rounded > 0 ? `${rounded}h overlap` : "no overlap");
  }
  return tags;
}
