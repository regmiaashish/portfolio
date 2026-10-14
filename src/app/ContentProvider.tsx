import { type PropsWithChildren, useEffect, useMemo, useState } from "react";

import { contentSnapshot } from "../data/snapshot";
import { ContentContext, isSiteContent } from "../hooks/useContent";
import { afterPaint } from "../lib/afterPaint";
import { request } from "../lib/api";
import type { SiteContent } from "../lib/cmsContracts";

/** Last good API content, per visitor, so repeat visits start from it (no visible swap). */
export const CONTENT_CACHE_KEY = "site-content-v1";

function readCache(): SiteContent | null {
  try {
    const raw = window.localStorage.getItem(CONTENT_CACHE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isSiteContent(value) ? value : null;
  } catch {
    return null; // storage blocked, or a corrupt entry: fall back to the snapshot
  }
}

function writeCache(content: SiteContent): void {
  try {
    window.localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(content));
  } catch {
    // Quota or privacy mode: the cache is only an optimisation.
  }
}

/**
 * Renders cached or bundled content immediately, then swaps in `GET /api/v1/content` once,
 * after the first paint. Any failure (network, 503, malformed body) keeps what's on screen:
 * the site never goes blank.
 */
export function ContentProvider({ children }: PropsWithChildren) {
  const [initial] = useState(() => {
    const cached = readCache();
    return cached
      ? { content: cached, source: "cache" as const }
      : { content: contentSnapshot, source: "snapshot" as const };
  });
  const [content, setContent] = useState<SiteContent>(initial.content);
  const [source, setSource] = useState<"snapshot" | "cache" | "api">(initial.source);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const cancel = afterPaint(() => {
      request<unknown>("/api/v1/content", { signal: controller.signal })
        .then((data) => {
          if (isSiteContent(data)) {
            setContent(data);
            setSource("api");
            writeCache(data);
          }
        })
        .catch(() => {
          // What's on screen stays; nothing to show the visitor.
        })
        .finally(() => {
          if (!controller.signal.aborted) setSettled(true);
        });
    });
    return () => {
      cancel();
      controller.abort();
    };
  }, []);

  const value = useMemo(() => ({ content, source, settled }), [content, source, settled]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}
