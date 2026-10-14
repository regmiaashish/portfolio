import { useCallback, useEffect, useReducer, useRef } from "react";

import { API_URL, apiErrorFromResponse, errorCode, NETWORK_ERROR_MESSAGE } from "../lib/api";
import { type SseMessage, SseParser } from "../lib/sse";

/**
 * Streams a pitch from GET /api/v1/pitch/stream.
 *
 * fetch() + a streaming parser rather than EventSource, deliberately: EventSource
 * reconnects on its own (re-running a paid pipeline) and can't read HTTP status codes or
 * JSON error bodies. This hook never retries; the visitor decides whether to try again.
 */

export const AGENT_NAMES = ["researcher", "matchmaker", "writer"] as const;
export type AgentName = (typeof AGENT_NAMES)[number];
export type AgentState = "idle" | "running" | "done" | "error";

export interface PitchLogEntry {
  agent: AgentName;
  message: string;
}

export interface PitchError {
  message: string;
  /** e.g. "daily_cap", "disabled", "timeout", "upstream". */
  code?: string;
}

export interface PitchState {
  status: "idle" | "running" | "done" | "error";
  agents: Record<AgentName, AgentState>;
  log: PitchLogEntry[];
  text: string;
  cached: boolean;
  error?: PitchError;
}

export const DROPPED_MESSAGE = "The connection dropped. Please try again.";

const IDLE_AGENTS: Record<AgentName, AgentState> = {
  researcher: "idle",
  matchmaker: "idle",
  writer: "idle",
};

export const INITIAL_PITCH_STATE: PitchState = {
  status: "idle",
  agents: IDLE_AGENTS,
  log: [],
  text: "",
  cached: false,
};

type Action =
  | { type: "start" }
  | { type: "agent"; agent: AgentName; status: AgentState }
  | { type: "log"; entry: PitchLogEntry }
  | { type: "token"; text: string }
  | { type: "done"; cached: boolean }
  | { type: "fail"; error: PitchError }
  | { type: "cancel" };

function failRunningAgents(agents: PitchState["agents"]): PitchState["agents"] {
  const next = { ...agents };
  for (const name of AGENT_NAMES) if (next[name] === "running") next[name] = "error";
  return next;
}

function reducer(state: PitchState, action: Action): PitchState {
  switch (action.type) {
    case "start":
      return { ...INITIAL_PITCH_STATE, status: "running" };
    case "agent":
      return { ...state, agents: { ...state.agents, [action.agent]: action.status } };
    case "log":
      return { ...state, log: [...state.log, action.entry] };
    case "token":
      return { ...state, text: state.text + action.text };
    case "done":
      return { ...state, status: "done", cached: action.cached };
    case "fail":
      return {
        ...state,
        status: "error",
        agents: failRunningAgents(state.agents),
        error: action.error,
      };
    case "cancel":
      return state.status === "running" ? { ...state, status: "idle" } : state;
  }
}

function isAgent(value: unknown): value is AgentName {
  return typeof value === "string" && (AGENT_NAMES as readonly string[]).includes(value);
}

function parseData(message: SseMessage): Record<string, unknown> | null {
  try {
    const data: unknown = JSON.parse(message.data);
    return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Maps one SSE message to actions. Returns true when the message ends the stream. */
function handleMessage(message: SseMessage, dispatch: (action: Action) => void): boolean {
  const data = parseData(message);
  if (!data) return false;

  switch (message.event) {
    case "agent":
      if (isAgent(data.agent) && (data.status === "running" || data.status === "done")) {
        dispatch({ type: "agent", agent: data.agent, status: data.status });
      }
      return false;
    case "log":
      if (isAgent(data.agent) && typeof data.message === "string") {
        dispatch({ type: "log", entry: { agent: data.agent, message: data.message } });
      }
      return false;
    case "token":
      if (typeof data.text === "string") dispatch({ type: "token", text: data.text });
      return false;
    case "done":
      dispatch({ type: "done", cached: data.cached === true });
      return true;
    case "error":
      dispatch({
        type: "fail",
        error: {
          message: typeof data.message === "string" ? data.message : DROPPED_MESSAGE,
          code: typeof data.code === "string" ? data.code : undefined,
        },
      });
      return true;
    default:
      return false;
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function usePitchStream() {
  const [state, rawDispatch] = useReducer(reducer, INITIAL_PITCH_STATE);
  const controllerRef = useRef<AbortController | null>(null);

  // Abort any run in flight when the component goes away.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    rawDispatch({ type: "cancel" });
  }, []);

  const start = useCallback(async (company: string, role: string, turnstileToken?: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    // Updates from a run that has been superseded or cancelled are dropped.
    const dispatch = (action: Action) => {
      if (!controller.signal.aborted) rawDispatch(action);
    };
    const fail = (message: string, code?: string) =>
      dispatch({ type: "fail", error: { message, code } });

    dispatch({ type: "start" });

    const params = new URLSearchParams({ company, role });
    if (turnstileToken) params.set("turnstile_token", turnstileToken);

    let response: Response;
    try {
      response = await fetch(`${API_URL}/api/v1/pitch/stream?${params.toString()}`, {
        signal: controller.signal,
        credentials: "omit",
        cache: "no-store",
        headers: { Accept: "text/event-stream" },
      });
    } catch (error) {
      if (!isAbort(error)) fail(NETWORK_ERROR_MESSAGE);
      return;
    }

    if (!response.ok) {
      const error = await apiErrorFromResponse(response);
      fail(error.message, errorCode(error));
      return;
    }
    if (!response.body) {
      fail("This browser can't stream the pitch. Please try another browser.");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const parser = new SseParser();
    let finished = false;

    try {
      while (!finished) {
        const { done, value } = await reader.read();
        const text = done ? decoder.decode() : decoder.decode(value, { stream: true });
        for (const message of parser.feed(text)) {
          if (handleMessage(message, dispatch)) {
            finished = true;
            break;
          }
        }
        if (done) break;
      }
    } catch (error) {
      if (isAbort(error) || controller.signal.aborted) return;
      fail(DROPPED_MESSAGE);
      return;
    } finally {
      if (finished) reader.cancel().catch(() => {});
    }

    if (!finished && !controller.signal.aborted) fail(DROPPED_MESSAGE);
    if (controllerRef.current === controller) controllerRef.current = null;
  }, []);

  return { state, start, cancel };
}
