import type { CareerEntry } from "../../lib/cmsContracts";

/** "Now", "Present" or "Current" marks the role I hold today. */
export function isCurrentPeriod(period: string): boolean {
  return /^(now|present|current)$/i.test(period.trim());
}

export function currentRole(career: CareerEntry[]): CareerEntry | undefined {
  return career.find((entry) => isCurrentPeriod(entry.period));
}
