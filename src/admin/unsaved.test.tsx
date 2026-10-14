import { act, render } from "@testing-library/react";
import { type MutableRefObject, useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UnsavedContext, useUnsavedChanges } from "./unsaved";

function Form({ dirty }: { dirty: boolean }) {
  useUnsavedChanges(dirty);
  return null;
}

let dirtyRef: MutableRefObject<boolean>;
function Harness({ dirty }: { dirty: boolean }) {
  dirtyRef = useRef(false);
  return (
    <UnsavedContext.Provider value={dirtyRef}>
      <Form dirty={dirty} />
    </UnsavedContext.Provider>
  );
}

const isGuardEntry = () => Boolean((window.history.state as Record<string, unknown> | null)?.__unsavedGuard);

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "");
});

describe("Back-button guard", () => {
  it("adds one duplicate history entry only while the form is dirty", () => {
    const push = vi.spyOn(window.history, "pushState");
    const { rerender } = render(<Harness dirty={false} />);
    expect(push).not.toHaveBeenCalled();

    rerender(<Harness dirty />);
    expect(push).toHaveBeenCalledTimes(1);
    expect(isGuardEntry()).toBe(true);
    expect(push.mock.calls[0][2]).toBe(window.location.href); // same URL, so Back stays put
  });

  it("asks on Back, and staying re-arms the guard", () => {
    render(<Harness dirty />);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const push = vi.spyOn(window.history, "pushState");
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(confirm).toHaveBeenCalledWith("You have unsaved changes. Leave without saving?");
    expect(push).toHaveBeenCalledTimes(1);
    expect(back).not.toHaveBeenCalled();
    expect(dirtyRef.current).toBe(true);
  });

  it("leaving goes back for real and stops guarding", () => {
    render(<Harness dirty />);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(back).toHaveBeenCalledTimes(1);
    expect(dirtyRef.current).toBe(false);
  });

  it("removes the duplicate entry when the changes are undone on the page", () => {
    const { rerender } = render(<Harness dirty />);
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});

    rerender(<Harness dirty={false} />);

    expect(back).toHaveBeenCalledTimes(1);
  });

  it("doesn't ask when nothing changed", () => {
    render(<Harness dirty={false} />);
    const confirm = vi.spyOn(window, "confirm");

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(confirm).not.toHaveBeenCalled();
  });
});
