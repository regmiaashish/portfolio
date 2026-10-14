import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";

import type { AdminContent } from "../lib/cmsContracts";
import { AdminContentContext } from "./adminContent";
import { adminApi } from "./api";
import { toSubmitError } from "./serverErrors";

export function AdminContentProvider({ children }: PropsWithChildren) {
  const [content, setContent] = useState<AdminContent | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await adminApi.content();
      setContent(data);
      setStatus("ready");
      setError(null);
    } catch (reason) {
      setError(toSubmitError(reason).message);
      setStatus((current) => (current === "ready" ? current : "error"));
      throw reason;
    }
  }, []);

  useEffect(() => {
    reload().catch(() => {
      // Shown through `status`/`error`.
    });
  }, [reload]);

  const value = useMemo(() => ({ status, content, error, reload }), [status, content, error, reload]);
  return <AdminContentContext.Provider value={value}>{children}</AdminContentContext.Provider>;
}
