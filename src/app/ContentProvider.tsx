import { type PropsWithChildren, useEffect, useMemo, useState } from "react";

import { contentSnapshot } from "../data/snapshot";
import { ContentContext, isSiteContent } from "../hooks/useContent";
import { request } from "../lib/api";
import type { SiteContent } from "../lib/cmsContracts";

/**
 * Renders the bundled snapshot immediately, then swaps in `GET /api/v1/content` once.
 * Any failure (network, 503, malformed body) keeps the snapshot: the site never goes blank.
 */
export function ContentProvider({ children }: PropsWithChildren) {
  const [content, setContent] = useState<SiteContent>(contentSnapshot);
  const [source, setSource] = useState<"snapshot" | "api">("snapshot");

  useEffect(() => {
    const controller = new AbortController();
    request<unknown>("/api/v1/content", { signal: controller.signal })
      .then((data) => {
        if (isSiteContent(data)) {
          setContent(data);
          setSource("api");
        }
      })
      .catch(() => {
        // Snapshot stays in place; nothing to show the visitor.
      });
    return () => controller.abort();
  }, []);

  const value = useMemo(() => ({ content, source }), [content, source]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}
