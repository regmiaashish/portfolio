import { useEffect, useState } from "react";

import { afterPaint } from "../lib/afterPaint";
import { request } from "../lib/api";

export const HEALTH_INTERVAL_MS = 30_000;
export const HEALTH_SAMPLES = 20;

export interface ApiHealth {
  status: "checking" | "online" | "offline";
  /** Round-trip times of successful checks, oldest first, measured in this browser (ms). */
  samples: number[];
}

/**
 * Real telemetry: times GET /health from the visitor's browser. Checks once after the first
 * paint, then every 30 s, and only while the tab is visible (no background polling).
 */
export function useApiHealth(): ApiHealth {
  const [health, setHealth] = useState<ApiHealth>({ status: "checking", samples: [] });

  useEffect(() => {
    let timer: number | undefined;
    let controller: AbortController | undefined;
    let disposed = false;

    const check = async () => {
      controller?.abort();
      controller = new AbortController();
      const started = performance.now();
      try {
        await request("/health", { signal: controller.signal });
        const elapsed = Math.max(1, Math.round(performance.now() - started));
        if (disposed) return;
        setHealth((previous) => ({
          status: "online",
          samples: [...previous.samples, elapsed].slice(-HEALTH_SAMPLES),
        }));
      } catch (error) {
        if (disposed || (error instanceof DOMException && error.name === "AbortError")) return;
        setHealth((previous) => ({ ...previous, status: "offline" }));
      }
    };

    const start = () => {
      if (timer !== undefined) return;
      void check();
      timer = window.setInterval(() => void check(), HEALTH_INTERVAL_MS);
    };

    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
      controller?.abort();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    const cancelFirst = afterPaint(() => {
      if (document.visibilityState !== "hidden") start();
    });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      cancelFirst();
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return health;
}
