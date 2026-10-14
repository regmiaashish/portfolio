import { useEffect, useState } from "react";

import { clockIn } from "../lib/format";

/** "HH:MM" in the given IANA time zone, updated on each minute boundary. */
export function useClock(timeZone: string): string | null {
  const [now, setNow] = useState(() => clockIn(timeZone));

  useEffect(() => {
    let interval: number | undefined;
    const tick = () => setNow(clockIn(timeZone));
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    const timeout = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, 60_000);
    }, msToNextMinute);
    return () => {
      window.clearTimeout(timeout);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [timeZone]);

  return now;
}
