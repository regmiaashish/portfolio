import { createContext, useContext } from "react";

import type { MessageStats } from "../lib/cmsContracts";

export interface MessageStatsValue {
  /** The latest `GET /api/v1/admin/messages/stats`, or null before it loads (or if it failed). */
  stats: MessageStats | null;
  /** Re-fetches the stats, e.g. after a message is read, marked unread or deleted. */
  refresh: () => void;
}

export const MessageStatsContext = createContext<MessageStatsValue>({
  stats: null,
  refresh: () => undefined,
});

/** Unread count and totals for the Messages tab badge and page. */
export function useMessageStats(): MessageStatsValue {
  return useContext(MessageStatsContext);
}
