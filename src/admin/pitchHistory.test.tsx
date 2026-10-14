import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { jsonResponse } from "../test/fetch";
import { mockPitchApi, pitchDetailFixture, pitchRunsFixture, pitchStatsFixture } from "../test/admin";
import { renderApp } from "../test/render";
import { CSRF_HEADER } from "./api";

afterEach(() => {
  vi.restoreAllMocks();
});

const LIST = "/api/v1/admin/pitches";

/** Query parameters of every list request so far. */
function listQueries(fetchMock: ReturnType<typeof mockPitchApi>["fetchMock"]) {
  return fetchMock.mock.calls
    .map(([input]) => new URL(String(input)))
    .filter((url) => url.pathname === LIST)
    .map((url) => Object.fromEntries(url.searchParams));
}

async function openHistory(url = "/admin/pitches") {
  renderApp(url);
  return screen.findByRole("heading", { level: 1, name: "Pitch history" });
}

describe("Pitch history: route and stats", () => {
  it("lives inside the lazy admin chunk and is a nav tab", async () => {
    mockPitchApi(3);
    renderApp("/admin/pitches");

    expect(screen.getByRole("status")).toHaveTextContent(/Loading the admin/);
    expect(await screen.findByRole("heading", { level: 1, name: "Pitch history" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Admin sections" });
    expect(within(nav).getByRole("link", { name: "Pitch history" })).toHaveAttribute("aria-current", "page");
  });

  it("shows on/off, today's paid runs against the cap as a meter, and 30-day spend", async () => {
    mockPitchApi(3);
    await openHistory();

    expect(await screen.findByText("Pitch Me is on")).toBeInTheDocument();
    expect(screen.getByText("12 of 100 paid runs today")).toBeInTheDocument();
    const meter = screen.getByRole("meter", { name: "Today (UTC)" });
    expect(meter).toHaveAttribute("value", "12");
    expect(meter).toHaveAttribute("max", "100");
    expect(screen.getByText("$0.0164")).toBeInTheDocument();
    expect(screen.getByText("140")).toBeInTheDocument();
  });

  it("says when Pitch Me is off", async () => {
    mockPitchApi(0, {
      "GET /api/v1/admin/pitches/stats": () => jsonResponse(200, pitchStatsFixture({ enabled: false })),
    });
    await openHistory();

    expect(await screen.findByText("Pitch Me is off")).toBeInTheDocument();
  });
});

describe("Pitch history: list", () => {
  it("requests the first page and renders a row per run with mapped outcomes", async () => {
    const { fetchMock } = mockPitchApi(6);
    await openHistory();

    const table = await screen.findByRole("table", { name: "Pitch runs, newest first" });
    expect(listQueries(fetchMock)[0]).toEqual({ limit: "20", offset: "0" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(6);
    expect(within(rows[0]).getByRole("link", { name: "Spotify, Backend engineer: view run" })).toBeInTheDocument();
    const outcomes = rows.map((row) => within(row).getAllByRole("cell")[2].textContent);
    expect(outcomes).toEqual(["Completed", "Cached", "Timed out", "Failed", "Failed", "Left early"]);
    expect(within(rows[0]).getByText("$0.0082")).toBeInTheDocument();
    expect(within(rows[0]).getByText("1.9 s")).toBeInTheDocument();
  });

  it("debounces the search and restarts from the first page", async () => {
    const user = userEvent.setup();
    const { fetchMock } = mockPitchApi(45);
    await openHistory("/admin/pitches?page=2");
    await screen.findByText("21–40 of 45");

    await user.type(screen.getByLabelText("Search company or role"), "spot");
    expect(listQueries(fetchMock).filter((q) => q.q)).toHaveLength(0);

    await waitFor(() => expect(listQueries(fetchMock).filter((q) => q.q)).toHaveLength(1));
    expect(listQueries(fetchMock).find((q) => q.q)).toEqual({ limit: "20", offset: "0", q: "spot" });
  });

  it("filters by outcome", async () => {
    const user = userEvent.setup();
    const { fetchMock } = mockPitchApi(6);
    await openHistory();
    await screen.findByRole("table");

    await user.selectOptions(screen.getByLabelText("Outcome"), "timeout");

    await waitFor(() =>
      expect(listQueries(fetchMock).at(-1)).toEqual({ limit: "20", offset: "0", outcome: "timeout" }),
    );
  });

  it("paginates with range labels and disables the ends", async () => {
    const user = userEvent.setup();
    const { fetchMock } = mockPitchApi(45);
    await openHistory();

    const pager = await screen.findByRole("navigation", { name: "Pitch history pages" });
    expect(within(pager).getByText("1–20 of 45")).toBeInTheDocument();
    expect(within(pager).getByRole("button", { name: "Previous" })).toBeDisabled();

    await user.click(within(pager).getByRole("button", { name: "Next" }));
    expect(await within(pager).findByText("21–40 of 45")).toBeInTheDocument();
    expect(listQueries(fetchMock).at(-1)).toMatchObject({ offset: "20" });

    await user.click(within(pager).getByRole("button", { name: "Next" }));
    expect(await within(pager).findByText("41–45 of 45")).toBeInTheDocument();
    expect(within(pager).getByRole("button", { name: "Next" })).toBeDisabled();
    expect(within(pager).getByRole("button", { name: "Previous" })).toBeEnabled();
  });

  it("shows an empty state", async () => {
    mockPitchApi(0);
    await openHistory();

    expect(await screen.findByText(/No pitches yet/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows a loading state while the list is pending", async () => {
    mockPitchApi(0, { [`GET ${LIST}`]: () => new Promise<Response>(() => undefined) });
    await openHistory();

    expect(screen.getByText("Loading pitch history…")).toBeInTheDocument();
  });

  it("shows the error with a retry that reloads", async () => {
    const user = userEvent.setup();
    let fail = true;
    mockPitchApi(0, {
      [`GET ${LIST}`]: () =>
        fail
          ? jsonResponse(500, { success: false, message: "Internal server error.", errors: null })
          : jsonResponse(200, { items: pitchRunsFixture(2), total: 2, limit: 20, offset: 0 }),
    });
    await openHistory();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Internal server error.");
    fail = false;
    await user.click(within(alert).getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
  });

  it("refreshes stats and list on demand", async () => {
    const user = userEvent.setup();
    const { calls } = mockPitchApi(3);
    await openHistory();
    await screen.findByRole("table");

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => expect(calls("GET", LIST)).toHaveLength(2));
    expect(calls("GET", `${LIST}/stats`)).toHaveLength(2);
  });
});

describe("Pitch history: detail", () => {
  const detailPath = `${LIST}/${pitchRunsFixture(1)[0].id}`;

  it("opens a run with every field and copies the pitch", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    mockPitchApi(3, {
      [`GET ${detailPath}`]: () => jsonResponse(200, pitchDetailFixture({ outcome: "upstream_error", error_code: "upstream" })),
    });
    await openHistory();

    await user.click(await screen.findByRole("link", { name: "Spotify, Backend engineer: view run" }));

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Spotify · Backend engineer");
    expect(screen.getByText("120 in / 45 out")).toBeInTheDocument();
    expect(screen.getByText("upstream")).toBeInTheDocument();
    expect(screen.getByText("$0.0082")).toBeInTheDocument();
    expect(screen.getByText(/I build backends that stay up/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Copy pitch" }));
    expect(writeText).toHaveBeenCalledWith(pitchDetailFixture().pitch_text);
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });

  it("deletes with the CSRF header and returns to a refreshed list", async () => {
    const user = userEvent.setup();
    const { calls } = mockPitchApi(3, {
      [`GET ${detailPath}`]: () => jsonResponse(200, pitchDetailFixture()),
      [`DELETE ${detailPath}`]: () => new Response(null, { status: 204 }),
    });
    await openHistory();
    await user.click(await screen.findByRole("link", { name: "Spotify, Backend engineer: view run" }));
    await screen.findByRole("heading", { level: 1, name: /Spotify/ });

    await user.click(screen.getByRole("button", { name: "Delete run" }));
    const dialog = screen.getByRole("dialog", { name: "Delete this pitch run?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete run" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Pitch history" })).toBeInTheDocument();
    expect(screen.getByText("Deleted the pitch run for Spotify.")).toBeInTheDocument();
    const [deleteCall] = calls("DELETE", detailPath);
    expect(deleteCall.init.credentials).toBe("include");
    expect(deleteCall.headers["X-Requested-With"]).toBe(CSRF_HEADER["X-Requested-With"]);
    await waitFor(() => expect(calls("GET", LIST)).toHaveLength(2));
  });

  it("explains a deleted run (404)", async () => {
    mockPitchApi(0, {
      [`GET ${LIST}/missing-id`]: () => jsonResponse(404, { success: false, message: "Not found.", errors: null }),
    });
    renderApp("/admin/pitches/missing-id");

    expect(await screen.findByRole("heading", { level: 1, name: "Run not found" })).toBeInTheDocument();
    expect(screen.getByText(/This run was deleted/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to pitch history" })).toHaveAttribute("href", "/admin/pitches");
  });
});
