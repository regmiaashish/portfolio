import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { profile } from "../data/profile";
import { FULL_CONTEXT, jsonResponse, mockApi } from "../test/fetch";
import { renderApp } from "../test/render";

function hoursPanel() {
  return within(screen.getByRole("region", { name: "Working hours" }));
}

describe("Contact page", () => {
  it("keeps the email link visible as the fallback, with every channel", () => {
    renderApp("/contact");

    const channels = within(screen.getByRole("region", { name: "Reach me directly" }));
    expect(channels.getByRole("link", { name: profile.email })).toHaveAttribute(
      "href",
      `mailto:${profile.email}`,
    );
    expect(channels.getByText(/Email always works/)).toBeInTheDocument();
    for (const social of profile.socials) {
      expect(channels.getByRole("link", { name: new RegExp(social.label) })).toHaveAttribute(
        "href",
        social.href,
      );
    }
  });

  it("puts the form in its own labelled panel", () => {
    renderApp("/contact");

    const form = within(screen.getByRole("region", { name: "Send a message" }));
    expect(form.getByRole("form", { name: "Contact form" })).toBeInTheDocument();
  });

  it("compares the visitor's working day with mine when the context loads", async () => {
    mockApi({ "GET /api/v1/context": () => jsonResponse(200, FULL_CONTEXT) });
    renderApp("/contact");

    expect(await hoursPanel().findByText("19:30")).toBeInTheDocument(); // visitor's time
    expect(hoursPanel().getByText("01:45")).toBeInTheDocument(); // my time from the API
    expect(hoursPanel().getByText("3 hours")).toBeInTheDocument();
    // London (UTC+1): my 09:00–18:00 is 04:15–13:15 on the visitor's clock.
    expect(hoursPanel().getByRole("img")).toHaveAccessibleName(
      "On your clock: your working day is 09:00–18:00; mine is 04:15–13:15; they overlap 09:00–13:15.",
    );
  });

  it("says when working days don't overlap", async () => {
    mockApi({
      "GET /api/v1/context": () =>
        jsonResponse(200, { ...FULL_CONTEXT, utc_offset_minutes: -240, timezone_overlap_hours: 0 }),
    });
    renderApp("/contact");

    expect(await hoursPanel().findByText("none")).toBeInTheDocument();
    expect(hoursPanel().getByText(/don't overlap, so I reply asynchronously/)).toBeInTheDocument();
  });

  it("falls back to Kathmandu time alone when the context is unavailable", async () => {
    mockApi({ "GET /api/v1/context": () => jsonResponse(503, { success: false, message: "x" }) });
    renderApp("/contact");

    expect(await hoursPanel().findByText("kathmandu only")).toBeInTheDocument();
    expect(hoursPanel().getByText(/^\d{2}:\d{2}$/)).toBeInTheDocument();
    expect(hoursPanel().queryByRole("img")).not.toBeInTheDocument();
    expect(hoursPanel().getByText(/I work from Kathmandu \(UTC\+5:45\)/)).toBeInTheDocument();
  });
});
