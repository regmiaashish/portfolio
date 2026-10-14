import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FULL_CONTEXT, jsonResponse, mockApi } from "../../test/fetch";
import { renderApp } from "../../test/render";

function greetingRegion() {
  return screen.getByTestId("visitor-greeting");
}

describe("Hero visitor greeting", () => {
  it("shows a busy skeleton, then the personalised greeting", async () => {
    mockApi({ "GET /api/v1/context": () => jsonResponse(200, FULL_CONTEXT) });
    renderApp("/");

    expect(greetingRegion()).toHaveAttribute("aria-busy", "true");
    expect(greetingRegion()).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Loading a personalised greeting")).toBeInTheDocument();

    expect(
      await screen.findByText("Good evening in London. It's light rain and 18°C where you are."),
    ).toBeInTheDocument();
    expect(greetingRegion()).toHaveAttribute("aria-busy", "false");
    expect(greetingRegion()).toHaveTextContent(
      "I'm in Kathmandu, where it's 01:45, so our working days overlap by about 3 hours.",
    );
    expect(greetingRegion()).toHaveTextContent("My rate is £45/hour (about $57).");
  });

  it("falls back to the generic greeting when the API answers 503", async () => {
    mockApi({
      "GET /api/v1/context": () =>
        jsonResponse(503, { success: false, message: "Provider down", errors: null }),
    });
    renderApp("/");

    expect(await screen.findByText("Namaste from Kathmandu.")).toBeInTheDocument();
    expect(greetingRegion()).toHaveTextContent(/It's \d{2}:\d{2} here in Nepal \(UTC\+5:45\)\./);
    expect(greetingRegion()).not.toHaveTextContent("Provider down");
  });

  it("falls back to the generic greeting when the network is down", async () => {
    mockApi({}); // every request fails like an offline network
    renderApp("/");

    expect(await screen.findByText("Namaste from Kathmandu.")).toBeInTheDocument();
    expect(greetingRegion()).toHaveAttribute("aria-busy", "false");
  });

  it("copes with partial data: no weather, no overlap, a GBP visitor", async () => {
    mockApi({
      "GET /api/v1/context": () =>
        jsonResponse(200, {
          ...FULL_CONTEXT,
          weather: null,
          timezone_overlap_hours: null,
          currency_code: "GBP",
          currency_symbol: "£",
        }),
    });
    renderApp("/");

    expect(await screen.findByText("Good evening in London.")).toBeInTheDocument();
    const text = greetingRegion().textContent ?? "";
    expect(text).toContain("I'm in Kathmandu, where it's 01:45. My rate is £45/hour.");
    expect(text).not.toMatch(/null|undefined|NaN|overlap/);
  });

  it("falls back when the old backend returns an unexpected shape", async () => {
    mockApi({ "GET /api/v1/context": () => jsonResponse(200, { detail: "weird" }) });
    renderApp("/");

    expect(await screen.findByText("Namaste from Kathmandu.")).toBeInTheDocument();
    await waitFor(() => expect(greetingRegion()).not.toHaveTextContent("weird"));
  });
});
