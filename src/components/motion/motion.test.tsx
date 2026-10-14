import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Reveal } from "./Reveal";
import { TransitionLink } from "./TransitionLink";

function reduceMotion(reduce: boolean) {
  const original = window.matchMedia;
  window.matchMedia = vi.fn((query: string) => ({
    ...original(query),
    matches: query.includes("reduced-motion") ? reduce : original(query).matches,
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

let restore: (() => void) | undefined;
afterEach(() => {
  restore?.();
  restore = undefined;
  delete (document as { startViewTransition?: unknown }).startViewTransition;
});

describe("Reveal", () => {
  it("shows content immediately without IntersectionObserver", () => {
    render(<Reveal>Hello</Reveal>);

    expect(screen.getByText("Hello")).toHaveAttribute("data-reveal", "shown");
  });

  it("waits for the element to scroll into view, then reveals it", () => {
    let trigger: ((entries: { isIntersecting: boolean }[]) => void) | undefined;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
          trigger = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    render(<Reveal>Hello</Reveal>);
    expect(screen.getByText("Hello")).toHaveAttribute("data-reveal", "pending");

    trigger?.([{ isIntersecting: true }]);

    return vi.waitFor(() =>
      expect(screen.getByText("Hello")).toHaveAttribute("data-reveal", "shown"),
    );
  });

  it("never hides content when the visitor prefers reduced motion", () => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    restore = reduceMotion(true);
    render(<Reveal>Hello</Reveal>);

    expect(screen.getByText("Hello")).toHaveAttribute("data-reveal", "shown");
  });
});

function renderLinkApp() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <TransitionLink to="/next">Go</TransitionLink>
      <Routes>
        <Route path="/" element={<p>Start page</p>} />
        <Route path="/next" element={<p>Next page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TransitionLink", () => {
  it("navigates normally when the browser has no View Transitions", async () => {
    const user = userEvent.setup();
    renderLinkApp();

    await user.click(screen.getByRole("link", { name: "Go" }));

    expect(screen.getByText("Next page")).toBeInTheDocument();
  });

  it("wraps the navigation in a view transition when supported", async () => {
    const user = userEvent.setup();
    const start = vi.fn((update: () => void) => update());
    Object.assign(document, { startViewTransition: start });
    renderLinkApp();

    await user.click(screen.getByRole("link", { name: "Go" }));

    expect(start).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Next page")).toBeInTheDocument();
  });

  it("skips the transition when the visitor prefers reduced motion", async () => {
    const user = userEvent.setup();
    const start = vi.fn((update: () => void) => update());
    Object.assign(document, { startViewTransition: start });
    restore = reduceMotion(true);
    renderLinkApp();

    await user.click(screen.getByRole("link", { name: "Go" }));

    expect(start).not.toHaveBeenCalled();
    expect(screen.getByText("Next page")).toBeInTheDocument();
  });

  it("leaves modified clicks (open in new tab) to the browser", async () => {
    const user = userEvent.setup();
    const start = vi.fn((update: () => void) => update());
    Object.assign(document, { startViewTransition: start });
    renderLinkApp();

    await user.keyboard("{Control>}");
    await user.click(screen.getByRole("link", { name: "Go" }));
    await user.keyboard("{/Control}");

    expect(start).not.toHaveBeenCalled();
  });
});
