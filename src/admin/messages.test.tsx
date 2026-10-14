import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { messageDetailFixture, messageStatsFixture, messagesFixture, mockMessagesApi } from "../test/admin";
import { jsonResponse } from "../test/fetch";
import { renderApp } from "../test/render";
import { CSRF_HEADER, messageListParams } from "./api";
import { REPLY_SUBJECT, deliveryDisplay, messagesTabLabel, replyHref } from "./messageFormat";

afterEach(() => {
  vi.restoreAllMocks();
});

const LIST = "/api/v1/admin/messages";
const STATS = `${LIST}/stats`;
const FIRST_ID = messagesFixture(1)[0].id;
const DETAIL = `${LIST}/${FIRST_ID}`;

function listQueries(fetchMock: ReturnType<typeof mockMessagesApi>["fetchMock"]) {
  return fetchMock.mock.calls
    .map(([input]) => new URL(String(input)))
    .filter((url) => url.pathname === LIST)
    .map((url) => Object.fromEntries(url.searchParams));
}

async function openMessages(url = "/admin/messages") {
  renderApp(url);
  return screen.findByRole("heading", { level: 1, name: "Messages" });
}

describe("message helpers", () => {
  it("builds list params, leaving empty filters out", () => {
    expect(messageListParams({ limit: 20, offset: 0, q: "  " })).toBe("limit=20&offset=0");
    expect(messageListParams({ limit: 20, offset: 40, q: "jane", status: "failed", unread: true })).toBe(
      "limit=20&offset=40&q=jane&status=failed&unread=true",
    );
  });

  it("labels delivery, the tab and the reply link", () => {
    expect(deliveryDisplay("failed")).toEqual({ label: "Email failed", status: "error" });
    expect(deliveryDisplay("pending").label).toBe("Sending email");
    expect(messagesTabLabel(3)).toBe("Messages, 3 unread");
    expect(messagesTabLabel(0)).toBe("Messages");
    expect(replyHref("jane@example.com")).toBe(
      `mailto:jane@example.com?subject=${encodeURIComponent(REPLY_SUBJECT)}`,
    );
  });
});

describe("Messages: tab and list", () => {
  it("is a nav tab whose name includes the unread count", async () => {
    mockMessagesApi(3);
    await openMessages();

    const nav = screen.getByRole("navigation", { name: "Admin sections" });
    const tab = await within(nav).findByRole("link", { name: "Messages, 3 unread" });
    expect(tab).toHaveAttribute("aria-current", "page");
    expect(within(tab).getByText("3")).toBeInTheDocument();
  });

  it("shows a plain tab when nothing is unread", async () => {
    mockMessagesApi(0, { [`GET ${STATS}`]: () => jsonResponse(200, messageStatsFixture({ unread: 0 })) });
    await openMessages();

    const nav = screen.getByRole("navigation", { name: "Admin sections" });
    expect(within(nav).getByRole("link", { name: "Messages" })).toBeInTheDocument();
  });

  it("requests the first page and marks unread messages in text, not only colour", async () => {
    const { fetchMock } = mockMessagesApi(4);
    await openMessages();

    const list = await screen.findByRole("list", { name: "Messages, newest first" });
    expect(listQueries(fetchMock)[0]).toEqual({ limit: "20", offset: "0" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(within(items[0]).getByRole("link", { name: "Unread message from Jane Doe" })).toBeInTheDocument();
    expect(within(items[0]).getByText("Unread")).toBeInTheDocument();
    expect(items[0]).toHaveAttribute("data-unread", "true");
    expect(within(items[1]).getByRole("link", { name: "Message from Sender 1" })).toBeInTheDocument();
    expect(within(items[1]).queryByText("Unread")).not.toBeInTheDocument();
    expect(within(items[2]).getByText("Email failed")).toBeInTheDocument();
    expect(within(items[0]).getByText(/backend role/)).toBeInTheDocument();
    expect(screen.getByText(/12 in total · 3 unread · 1 with a failed email · 5 in the last 7 days/)).toBeInTheDocument();
  });

  it("filters Unread and Email failed, keeping the filter in the URL", async () => {
    const user = userEvent.setup();
    const { fetchMock } = mockMessagesApi(4);
    await openMessages();
    await screen.findByRole("list", { name: /Messages/ });
    const group = screen.getByRole("group", { name: "Show" });

    await user.click(within(group).getByRole("button", { name: "Unread" }));
    await waitFor(() => expect(listQueries(fetchMock).at(-1)).toEqual({ limit: "20", offset: "0", unread: "true" }));
    expect(within(group).getByRole("button", { name: "Unread" })).toHaveAttribute("aria-pressed", "true");

    await user.click(within(group).getByRole("button", { name: "Email failed" }));
    await waitFor(() => expect(listQueries(fetchMock).at(-1)).toEqual({ limit: "20", offset: "0", status: "failed" }));
  });

  it("reads the filter from the URL", async () => {
    const { fetchMock } = mockMessagesApi(4);
    await openMessages("/admin/messages?filter=failed");

    await waitFor(() => expect(listQueries(fetchMock)[0]).toEqual({ limit: "20", offset: "0", status: "failed" }));
  });

  it("debounces the search and restarts from the first page", async () => {
    const user = userEvent.setup();
    const { fetchMock } = mockMessagesApi(45);
    await openMessages("/admin/messages?page=2");
    await screen.findByText("21–40 of 45");

    const box = screen.getByLabelText("Search name, email or message");
    expect(box).toHaveAttribute("maxLength", "100");
    await user.type(box, "jane");
    expect(listQueries(fetchMock).filter((q) => q.q)).toHaveLength(0);

    await waitFor(() => expect(listQueries(fetchMock).filter((q) => q.q)).toHaveLength(1));
    expect(listQueries(fetchMock).find((q) => q.q)).toEqual({ limit: "20", offset: "0", q: "jane" });
  });

  it("paginates", async () => {
    const user = userEvent.setup();
    const { fetchMock } = mockMessagesApi(25);
    await openMessages();

    const pager = await screen.findByRole("navigation", { name: "Message pages" });
    expect(within(pager).getByRole("button", { name: "Previous" })).toBeDisabled();
    await user.click(within(pager).getByRole("button", { name: "Next" }));
    expect(await within(pager).findByText("21–25 of 25")).toBeInTheDocument();
    expect(listQueries(fetchMock).at(-1)).toMatchObject({ offset: "20" });
    expect(within(pager).getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("shows loading, empty and error-with-retry states", async () => {
    const user = userEvent.setup();
    let mode: "pending" | "fail" | "empty" = "pending";
    mockMessagesApi(0, {
      [`GET ${LIST}`]: () =>
        mode === "pending"
          ? new Promise<Response>(() => undefined)
          : mode === "fail"
            ? jsonResponse(500, { success: false, message: "Internal server error.", errors: null })
            : jsonResponse(200, { items: [], total: 0, limit: 20, offset: 0 }),
    });
    await openMessages();
    expect(screen.getByText("Loading messages…")).toBeInTheDocument();

    mode = "fail";
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Internal server error.");

    mode = "empty";
    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/No messages yet/)).toBeInTheDocument();
  });

  it("refreshes the list and the stats on demand", async () => {
    const user = userEvent.setup();
    const { calls } = mockMessagesApi(3);
    await openMessages();
    await screen.findByRole("list", { name: /Messages/ });
    const before = calls("GET", STATS).length;

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => expect(calls("GET", LIST)).toHaveLength(2));
    await waitFor(() => expect(calls("GET", STATS).length).toBeGreaterThan(before));
  });
});

describe("Messages: detail", () => {
  it("marks an unread message read once and refreshes the badge", async () => {
    let unread = 3;
    const { calls } = mockMessagesApi(3, {
      [`GET ${STATS}`]: () => jsonResponse(200, messageStatsFixture({ unread })),
      [`GET ${DETAIL}`]: () => jsonResponse(200, messageDetailFixture()),
      [`PATCH ${DETAIL}`]: () => {
        unread = 2;
        return jsonResponse(200, messageDetailFixture({ read: true, read_at: "2026-10-14T13:00:00Z" }));
      },
    });
    renderApp(`/admin/messages/${FIRST_ID}`);

    expect(await screen.findByRole("heading", { level: 1, name: "Jane Doe" })).toBeInTheDocument();
    await waitFor(() => expect(calls("PATCH", DETAIL)).toHaveLength(1));
    expect(calls("PATCH", DETAIL)[0].body).toEqual({ read: true });
    expect(await screen.findByRole("link", { name: "Messages, 2 unread" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Mark as unread" })).toBeInTheDocument();
    expect(calls("PATCH", DETAIL)).toHaveLength(1);
  });

  it("does not patch a message that is already read", async () => {
    const { calls } = mockMessagesApi(3, {
      [`GET ${DETAIL}`]: () => jsonResponse(200, messageDetailFixture({ read: true })),
    });
    renderApp(`/admin/messages/${FIRST_ID}`);
    await screen.findByRole("heading", { level: 1, name: "Jane Doe" });

    expect(calls("PATCH", DETAIL)).toHaveLength(0);
  });

  it("shows the message as plain text, never HTML", async () => {
    mockMessagesApi(3, {
      [`GET ${DETAIL}`]: () =>
        jsonResponse(200, messageDetailFixture({ read: true, message: "Hello <b>html</b>\n<img src=x onerror=alert(1)>" })),
    });
    renderApp(`/admin/messages/${FIRST_ID}`);
    await screen.findByRole("heading", { level: 1, name: "Jane Doe" });

    const section = screen.getByRole("region", { name: "Message" });
    expect(within(section).getByText(/Hello <b>html<\/b>/)).toBeInTheDocument();
    expect(section.querySelector("b")).toBeNull();
    expect(section.querySelector("img")).toBeNull();
  });

  it("replies by mailto with the standard subject and copies the email", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    mockMessagesApi(3, { [`GET ${DETAIL}`]: () => jsonResponse(200, messageDetailFixture({ read: true })) });
    renderApp(`/admin/messages/${FIRST_ID}`);
    await screen.findByRole("heading", { level: 1, name: "Jane Doe" });

    expect(screen.getByRole("link", { name: "Reply" })).toHaveAttribute(
      "href",
      "mailto:jane@example.com?subject=Re%3A%20your%20message%20on%20aashish-regmi.com.np",
    );
    await user.click(screen.getByRole("button", { name: "Copy email" }));
    expect(writeText).toHaveBeenCalledWith("jane@example.com");
    expect(await screen.findByText("Email address copied.")).toBeInTheDocument();
  });

  it("marks as unread with the CSRF header", async () => {
    const user = userEvent.setup();
    const { calls } = mockMessagesApi(3, {
      [`GET ${DETAIL}`]: () => jsonResponse(200, messageDetailFixture({ read: true })),
      [`PATCH ${DETAIL}`]: () => jsonResponse(200, messageDetailFixture({ read: false })),
    });
    renderApp(`/admin/messages/${FIRST_ID}`);
    await screen.findByRole("heading", { level: 1, name: "Jane Doe" });

    await user.click(screen.getByRole("button", { name: "Mark as unread" }));

    expect(await screen.findByText("Marked as unread.")).toBeInTheDocument();
    const [call] = calls("PATCH", DETAIL);
    expect(call.body).toEqual({ read: false });
    expect(call.headers["X-Requested-With"]).toBe(CSRF_HEADER["X-Requested-With"]);
    expect(screen.getByRole("button", { name: "Mark as read" })).toBeInTheDocument();
    // Opening it doesn't re-mark it read behind the admin's back.
    expect(calls("PATCH", DETAIL)).toHaveLength(1);
  });

  it("offers Retry only for failed emails and shows the new pending status", async () => {
    const user = userEvent.setup();
    const { calls } = mockMessagesApi(3, {
      [`GET ${DETAIL}`]: () =>
        jsonResponse(200, messageDetailFixture({ read: true, status: "failed", error: "SMTP timeout" })),
      [`POST ${DETAIL}/retry`]: () => jsonResponse(202, messageDetailFixture({ read: true, status: "pending" })),
    });
    renderApp(`/admin/messages/${FIRST_ID}`);
    await screen.findByRole("heading", { level: 1, name: "Jane Doe" });

    expect(screen.getByText("Email failed")).toBeInTheDocument();
    expect(screen.getByText("SMTP timeout")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry email" }));

    expect(await screen.findByText("Sending email")).toBeInTheDocument();
    expect(screen.queryByText("SMTP timeout")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry email" })).not.toBeInTheDocument();
    const [call] = calls("POST", `${DETAIL}/retry`);
    expect(call.init.credentials).toBe("include");
    expect(call.headers["X-Requested-With"]).toBe(CSRF_HEADER["X-Requested-With"]);
  });

  it("hides Retry when the email was sent", async () => {
    mockMessagesApi(3, { [`GET ${DETAIL}`]: () => jsonResponse(200, messageDetailFixture({ read: true })) });
    renderApp(`/admin/messages/${FIRST_ID}`);
    await screen.findByRole("heading", { level: 1, name: "Jane Doe" });

    expect(screen.getByText("Email sent")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry email" })).not.toBeInTheDocument();
  });

  it("deletes after confirming, with cookies and CSRF, and returns to a refreshed list", async () => {
    const user = userEvent.setup();
    const { calls } = mockMessagesApi(3, {
      [`GET ${DETAIL}`]: () => jsonResponse(200, messageDetailFixture({ read: true })),
      [`DELETE ${DETAIL}`]: () => new Response(null, { status: 204 }),
    });
    await openMessages();
    await user.click(await screen.findByRole("link", { name: "Unread message from Jane Doe" }));
    await screen.findByRole("heading", { level: 1, name: "Jane Doe" });
    const statsBefore = calls("GET", STATS).length;

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: "Delete this message?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete message" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Messages" })).toBeInTheDocument();
    expect(screen.getByText("Deleted the message from Jane Doe.")).toBeInTheDocument();
    const [call] = calls("DELETE", DETAIL);
    expect(call.init.credentials).toBe("include");
    expect(call.headers["X-Requested-With"]).toBe(CSRF_HEADER["X-Requested-With"]);
    await waitFor(() => expect(calls("GET", LIST)).toHaveLength(2));
    await waitFor(() => expect(calls("GET", STATS).length).toBeGreaterThan(statsBefore));
  });

  it("explains a deleted message (404)", async () => {
    mockMessagesApi(0, {
      [`GET ${LIST}/gone`]: () => jsonResponse(404, { success: false, message: "Not found.", errors: null }),
    });
    renderApp("/admin/messages/gone");

    expect(await screen.findByRole("heading", { level: 1, name: "Message not found" })).toBeInTheDocument();
    expect(screen.getByText(/This message was deleted/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to messages" })).toHaveAttribute("href", "/admin/messages");
  });
});
