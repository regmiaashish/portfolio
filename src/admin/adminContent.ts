import { createContext, useContext } from "react";

import type { AdminContent } from "../lib/cmsContracts";

export interface AdminContentValue {
  status: "loading" | "ready" | "error";
  content: AdminContent | null;
  error: string | null;
  /** Re-fetches `GET /api/v1/admin/content`; resolves once the new data is in place. */
  reload: () => Promise<void>;
}

export const AdminContentContext = createContext<AdminContentValue | null>(null);

export function useAdminContent(): AdminContentValue {
  const value = useContext(AdminContentContext);
  if (!value) throw new Error("useAdminContent must be used inside <AdminContentProvider>");
  return value;
}

export interface AdminSessionValue {
  userName: string;
  signOut: () => Promise<void>;
}

export const AdminSessionContext = createContext<AdminSessionValue | null>(null);

export function useAdminSession(): AdminSessionValue {
  const value = useContext(AdminSessionContext);
  if (!value) throw new Error("useAdminSession must be used inside <AdminApp>");
  return value;
}
