import { describe, expect, it } from "vitest";

import type { AgentState } from "../hooks/usePitchStream";
import { linkState, pipelineLamp } from "./pitchPipeline";

function agents(researcher: AgentState, matchmaker: AgentState, writer: AgentState) {
  return { researcher, matchmaker, writer };
}

describe("linkState", () => {
  it("stays idle until the upstream agent is done", () => {
    expect(linkState(agents("idle", "idle", "idle"), 0)).toBe("idle");
    expect(linkState(agents("running", "idle", "idle"), 0)).toBe("idle");
    expect(linkState(agents("error", "idle", "idle"), 0)).toBe("idle");
  });

  it("flows while the next agent works, then stays lit", () => {
    expect(linkState(agents("done", "running", "idle"), 0)).toBe("flow");
    expect(linkState(agents("done", "done", "running"), 0)).toBe("lit");
    expect(linkState(agents("done", "done", "running"), 1)).toBe("flow");
    expect(linkState(agents("done", "done", "done"), 1)).toBe("lit");
  });
});

describe("pipelineLamp", () => {
  it("summarises the run", () => {
    expect(pipelineLamp("idle", false)).toEqual({ status: "live", label: "ready" });
    expect(pipelineLamp("running", false)).toEqual({ status: "running", label: "running" });
    expect(pipelineLamp("done", true)).toEqual({ status: "done", label: "done · cached" });
    expect(pipelineLamp("error", false)).toEqual({ status: "error", label: "stopped" });
  });
});
