/** Display helpers for the admin's contact messages (pure; unit-tested in messageFormat.test.ts). */
import type { Status } from "../components/ui/StatusDot";
import type { MessageStatus } from "../lib/cmsContracts";

const DELIVERY: Record<MessageStatus, { label: string; status: Status }> = {
  pending: { label: "Sending email", status: "running" },
  sent: { label: "Email sent", status: "done" },
  failed: { label: "Email failed", status: "error" },
};

/** How the notification email for a message is doing, as a word plus a status light. */
export function deliveryDisplay(status: MessageStatus): { label: string; status: Status } {
  return DELIVERY[status] ?? { label: status, status: "idle" };
}

export type MessageFilter = "unread" | "failed";

/** The list filters, in display order; `undefined` is "All". */
export const MESSAGE_FILTERS: { value: MessageFilter | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "unread", label: "Unread" },
  { value: "failed", label: "Email failed" },
];

export function isMessageFilter(value: string | null): value is MessageFilter {
  return value === "unread" || value === "failed";
}

export const REPLY_SUBJECT = "Re: your message on aashish-regmi.com.np";

/** `mailto:` link that replies to the sender with the standard subject. */
export function replyHref(email: string): string {
  const to = encodeURIComponent(email).replace(/%40/g, "@");
  return `mailto:${to}?subject=${encodeURIComponent(REPLY_SUBJECT)}`;
}

/** Accessible name for the nav tab: "Messages, 3 unread" (just "Messages" when none). */
export function messagesTabLabel(unread: number | null | undefined): string {
  return unread ? `Messages, ${unread} unread` : "Messages";
}
