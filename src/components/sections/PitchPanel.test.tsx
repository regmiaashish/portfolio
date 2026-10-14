import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { jsonResponse } from "../../test/fetch";
import { renderApp } from "../../test/render";
import { happyPathEvents, sseResponse } from "../../test/sse";

/** Routes the app's requests: the pitch stream is answered by `pitch`, the rest fail. */
function stubApi(pitch: () => Response) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v1/pitch/stream") return pitch();
    throw new TypeError(`Unmocked request: ${url.pathname}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function pitchCalls(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.filter(([input]) => String(input).includes("/pitch/stream"));
}

function panel() {
  return within(screen.getByRole("complementary", { name: "Pitch me" }));
}

describe("PitchPanel with VITE_PITCH_ENABLED unset (shipped dark)", () => {
  it("keeps the disabled coming-soon panel and never calls the pitch endpoint", async () => {
    const fetchMock = stubApi(() => sseResponse(happyPathEvents()));
    renderApp();

    expect(panel().getByRole("button", { name: "Pitch me (coming soon)" })).toBeDisabled();
    expect(panel().getByLabelText("Company")).toBeDisabled();
    expect(panel().getByLabelText("Role")).toBeDisabled();
    expect(panel().getByText(/Coming soon\./)).toBeInTheDocument();
    expect(pitchCalls(fetchMock)).toHaveLength(0);
  });
});

describe("PitchPanel with VITE_PITCH_ENABLED=true", () => {
  it("blocks unsafe or empty input before calling the backend", async () => {
    vi.stubEnv("VITE_PITCH_ENABLED", "true");
    const fetchMock = stubApi(() => sseResponse(happyPathEvents()));
    const user = userEvent.setup();
    renderApp();

    await user.type(panel().getByLabelText("Company"), "<script>");
    await user.click(panel().getByRole("button", { name: "Pitch me" }));

    expect(panel().getByText(/Use letters, numbers, spaces/)).toBeInTheDocument();
    expect(panel().getByText("Enter a role.")).toBeInTheDocument();
    expect(panel().getByLabelText("Company")).toHaveFocus();
    expect(pitchCalls(fetchMock)).toHaveLength(0);
  });

  it("streams a pitch, shows agent progress and the log, then copies it", async () => {
    vi.stubEnv("VITE_PITCH_ENABLED", "true");
    const fetchMock = stubApi(() => sseResponse(happyPathEvents()));
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    renderApp();

    await user.type(panel().getByLabelText("Company"), "Spotify");
    await user.type(panel().getByLabelText("Role"), "Backend");
    await user.click(panel().getByRole("button", { name: "Pitch me" }));

    await waitFor(() =>
      expect(panel().getByText("Hi Spotify, I build reliable backends.")).toBeInTheDocument(),
    );
    expect(panel().getByRole("status")).toHaveTextContent("Your pitch is ready.");
    expect(panel().getByRole("log", { name: "Agent log" })).toHaveTextContent("Matched 3 projects");
    for (const agent of ["Researcher", "Matchmaker", "Writer"]) {
      expect(panel().getByText(agent).closest("li")).toHaveTextContent("done");
    }
    const url = new URL(String(pitchCalls(fetchMock)[0][0]));
    expect(url.searchParams.get("company")).toBe("Spotify");
    expect(url.searchParams.has("turnstile_token")).toBe(false);

    await user.click(panel().getByRole("button", { name: "Copy pitch" }));
    expect(writeText).toHaveBeenCalledWith("Hi Spotify, I build reliable backends.");
    expect(panel().getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("notes a cached result", async () => {
    vi.stubEnv("VITE_PITCH_ENABLED", "true");
    stubApi(() => sseResponse(happyPathEvents("Cached pitch.", true)));
    const user = userEvent.setup();
    renderApp();

    await user.type(panel().getByLabelText("Company"), "Spotify");
    await user.type(panel().getByLabelText("Role"), "Backend");
    await user.click(panel().getByRole("button", { name: "Pitch me" }));

    expect(await panel().findByText(/Cached result/)).toBeInTheDocument();
  });

  it("shows friendly copy when the daily cap is reached and keeps the input", async () => {
    vi.stubEnv("VITE_PITCH_ENABLED", "true");
    stubApi(() =>
      jsonResponse(429, {
        success: false,
        message: "The demo is resting for today. Try again tomorrow.",
        errors: { code: "daily_cap" },
      }),
    );
    const user = userEvent.setup();
    renderApp();

    await user.type(panel().getByLabelText("Company"), "Spotify");
    await user.type(panel().getByLabelText("Role"), "Backend");
    await user.click(panel().getByRole("button", { name: "Pitch me" }));

    expect(await panel().findByRole("alert")).toHaveTextContent(
      "The demo is resting for today. Try again tomorrow. You can still email me directly.",
    );
    expect(panel().getByLabelText("Company")).toHaveValue("Spotify");
    expect(panel().getByRole("button", { name: "Copy pitch" })).toBeDisabled();
  });

  it("reports a failed copy", async () => {
    vi.stubEnv("VITE_PITCH_ENABLED", "true");
    stubApi(() => sseResponse(happyPathEvents()));
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    renderApp();

    await user.type(panel().getByLabelText("Company"), "Spotify");
    await user.type(panel().getByLabelText("Role"), "Backend");
    await user.click(panel().getByRole("button", { name: "Pitch me" }));
    await user.click(await panel().findByRole("button", { name: "Copy pitch" }));

    expect(await panel().findByText(/Couldn't copy automatically/)).toBeInTheDocument();
  });
});
