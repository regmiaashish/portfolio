import { useEffect, useState } from "react";

import { afterPaint } from "../lib/afterPaint";
import { request } from "../lib/api";
import type { VisitorContext } from "../lib/contracts";

export type VisitorContextState =
  | { status: "loading"; data: null }
  | { status: "ready"; data: VisitorContext }
  | { status: "error"; data: null };

/**
 * Fetches the visitor's context (location, weather, time overlap) once.
 * The backend works out who the visitor is from the request itself, so the browser
 * makes no third-party calls. Any failure resolves to "error"; callers show a generic greeting.
 */
export function useVisitorContext(): VisitorContextState {
  const [state, setState] = useState<VisitorContextState>({ status: "loading", data: null });

  useEffect(() => {
    const controller = new AbortController();

    // Not needed for the first paint (the greeting shows a skeleton), so it waits until after it.
    const cancel = afterPaint(() => {
    request<VisitorContext>("/api/v1/context", { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data && typeof data === "object" && !Array.isArray(data)) {
          setState({ status: "ready", data });
        } else {
          setState({ status: "error", data: null });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return; // unmounted: nothing to update
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "error", data: null });
      });
    });

    return () => {
      cancel();
      controller.abort();
    };
  }, []);

  return state;
}
