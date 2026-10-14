import { AGENT_NAMES, type AgentName, type AgentState } from "../hooks/usePitchStream";

export const AGENT_LABELS: Record<AgentName, string> = {
  researcher: "Researcher",
  matchmaker: "Matchmaker",
  writer: "Writer",
};

export const AGENT_TASKS: Record<AgentName, string> = {
  researcher: "Searches the web for the company and the role",
  matchmaker: "Picks the most relevant of my real projects",
  writer: "Writes a three-sentence pitch, streamed live",
};

export type LinkState = "idle" | "lit" | "flow";

/**
 * State of the connector leaving agent `index`: lit once that agent is done, flowing while
 * the next agent is working on its output.
 */
export function linkState(agents: Record<AgentName, AgentState>, index: number): LinkState {
  const from = agents[AGENT_NAMES[index]];
  const to = agents[AGENT_NAMES[index + 1]];
  if (from !== "done") return "idle";
  return to === "running" ? "flow" : "lit";
}

export type RunStatus = "idle" | "running" | "done" | "error";

/** The pipeline panel's overall lamp: what the whole run is doing right now. */
export function pipelineLamp(status: RunStatus, cached: boolean): {
  status: "idle" | "running" | "done" | "error" | "live";
  label: string;
} {
  switch (status) {
    case "running":
      return { status: "running", label: "running" };
    case "done":
      return { status: "done", label: cached ? "done · cached" : "done" };
    case "error":
      return { status: "error", label: "stopped" };
    default:
      return { status: "live", label: "ready" };
  }
}
