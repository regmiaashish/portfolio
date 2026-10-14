import { vi } from "vitest";

import type { Schemas } from "../lib/api";

/** `url` lets a handler read the query string (e.g. pagination). */
type Handler = (init: RequestInit | undefined, url: URL) => Response | Promise<Response>;

export function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

/**
 * Stubs fetch with handlers keyed by "METHOD /path". Anything else fails like an offline
 * network, so no test can reach a real server.
 */
export function mockApi(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    const key = `${(init?.method ?? "GET").toUpperCase()} ${url.pathname}`;
    const handler = handlers[key];
    if (!handler) throw new TypeError(`Unmocked request: ${key}`);
    return handler(init, url);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** A complete response, exactly as the Phase 3 backend sends it (numbers are JSON numbers). */
export const FULL_CONTEXT: Schemas["VisitorContext"] = {
  city: "London",
  country: "United Kingdom",
  country_code: "GB",
  timezone: "Europe/London",
  local_time: "2026-10-14T19:30:00+01:00",
  utc_offset_minutes: 60,
  weather: {
    temperature_c: 18.2,
    apparent_temperature_c: 17,
    precipitation_mm: 0.2,
    weather_code: 61,
    description: "light rain",
    is_day: false,
  },
  currency_code: "USD",
  currency_symbol: "$",
  base_currency: "GBP",
  conversion_rate: 1.27,
  hourly_rate_gbp: 45,
  hourly_rate_local: 57.15,
  my_timezone: "Asia/Kathmandu",
  my_local_time: "2026-10-15T01:45:00+05:45",
  timezone_overlap_hours: 3,
};
