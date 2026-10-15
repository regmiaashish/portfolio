import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useRequestState } from "./useRequestState";

type Load = { status: "loading"; data?: string } | { status: "ready"; data: string };

const pending = (previous: Load | undefined): Load => ({ status: "loading", data: previous?.data });

describe("useRequestState", () => {
  it("is pending until a result is stored for the current key", () => {
    const { result, rerender } = renderHook(({ key }) => useRequestState<Load>(key, pending), {
      initialProps: { key: "page-1" },
    });
    expect(result.current[0]).toEqual({ status: "loading", data: undefined });

    act(() => result.current[1]("page-1", { status: "ready", data: "first" }));
    expect(result.current[0]).toEqual({ status: "ready", data: "first" });

    // A new key is loading straight away, still showing the previous data.
    rerender({ key: "page-2" });
    expect(result.current[0]).toEqual({ status: "loading", data: "first" });

    act(() => result.current[1]("page-2", { status: "ready", data: "second" }));
    expect(result.current[0]).toEqual({ status: "ready", data: "second" });
  });

  it("doesn't let a late result for an old key count as the current one", () => {
    const { result, rerender } = renderHook(({ key }) => useRequestState<Load>(key, pending), {
      initialProps: { key: "a" },
    });
    rerender({ key: "b" });

    act(() => result.current[1]("a", { status: "ready", data: "stale" }));
    expect(result.current[0].status).toBe("loading");
  });

  it("keeps the current result when an old key's answer arrives after it", () => {
    const { result, rerender } = renderHook(({ key }) => useRequestState<Load>(key, pending), {
      initialProps: { key: "a" },
    });
    rerender({ key: "b" });
    act(() => result.current[1]("b", { status: "ready", data: "current" }));

    act(() => result.current[1]("a", { status: "ready", data: "stale" }));
    expect(result.current[0]).toEqual({ status: "ready", data: "current" });
  });

  it("updates the stored result in place", () => {
    const { result } = renderHook(() => useRequestState<Load>("k", pending));
    act(() => result.current[1]("k", { status: "ready", data: "v1" }));

    act(() => result.current[2]((current) => ({ ...current, data: "v2" }) as Load));
    expect(result.current[0]).toEqual({ status: "ready", data: "v2" });
  });
});
