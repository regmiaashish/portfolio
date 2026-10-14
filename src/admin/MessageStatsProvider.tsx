import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";

import type { MessageStats } from "../lib/cmsContracts";
import { adminApi } from "./api";
import { MessageStatsContext } from "./unreadMessages";

/** Loads the message stats once per admin session and whenever a page asks for a refresh. */
export function MessageStatsProvider({ children }: PropsWithChildren) {
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    adminApi
      .messageStats(controller.signal)
      .then(setStats)
      .catch(() => {
        // The badge is a convenience: on failure it keeps the last known count.
      });
    return () => controller.abort();
  }, [reloadKey]);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);
  const value = useMemo(() => ({ stats, refresh }), [stats, refresh]);
  return <MessageStatsContext.Provider value={value}>{children}</MessageStatsContext.Provider>;
}
