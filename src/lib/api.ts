/**
 * The one way the frontend talks to the backend.
 *
 * - One base URL (VITE_API_URL; `vite build` fails if it is missing).
 * - One `request()` wrapper: JSON in, JSON out, typed with the generated OpenAPI types.
 * - One error type: every failure becomes an `ApiError` with a human-readable `message`,
 *   whether the backend sent `{success:false, message, errors}`, a legacy `{detail}`,
 *   or nothing at all (network down, proxy error page).
 */
import type { components } from "./api-types";

export type Schemas = components["schemas"];
export type ErrorBody = Schemas["ErrorResponse"];

export const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly errors: ErrorBody["errors"];

  constructor(status: number, message: string, errors: ErrorBody["errors"] = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }

  /** True when the request never got an HTTP response (offline, DNS, CORS, ...). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

const FALLBACK_MESSAGES: Record<number, string> = {
  0: "Can't reach the server. Check your connection and try again.",
  400: "That request wasn't valid.",
  401: "Please sign in to continue.",
  403: "You don't have permission to do that.",
  404: "That wasn't found.",
  422: "Some of the details aren't valid.",
  429: "Too many requests. Please wait a moment and try again.",
};

function fallbackMessage(status: number): string {
  if (status >= 500) return "Something went wrong on our side. Please try again later.";
  return FALLBACK_MESSAGES[status] ?? "Something went wrong. Please try again.";
}

function messageFrom(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.message === "string" && record.message) return record.message;
    // Responses from before the Phase 1 backend used FastAPI's default {"detail": "..."}.
    if (typeof record.detail === "string" && record.detail) return record.detail;
  }
  return fallbackMessage(status);
}

function errorsFrom(body: unknown): ErrorBody["errors"] {
  if (body && typeof body === "object" && "errors" in body) {
    const errors = (body as { errors: unknown }).errors;
    if (Array.isArray(errors) || (errors && typeof errors === "object")) {
      return errors as ErrorBody["errors"];
    }
  }
  return null;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text; // e.g. an HTML error page from a proxy
  }
}

/** Builds the ApiError for a non-2xx response (shared by request() and streaming callers). */
export async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  const data = await readBody(response);
  return new ApiError(response.status, messageFrom(data, response.status), errorsFrom(data));
}

/** The machine-readable `errors.code` the backend attaches to some errors, if any. */
export function errorCode(error: ApiError): string | undefined {
  const errors = error.errors;
  if (errors && !Array.isArray(errors) && typeof errors === "object") {
    const code = (errors as Record<string, unknown>).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

/** The message shown when the request never reached the server. */
export const NETWORK_ERROR_MESSAGE = fallbackMessage(0);

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Send cookies cross-origin. Only the admin (auth) endpoints need this. */
  withCredentials?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal, headers = {}, withCredentials = false } = options;
  const hasBody = body !== undefined;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
      method,
      signal,
      credentials: withCredentials ? "include" : "omit",
      headers: {
        Accept: "application/json",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: hasBody ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    // Let callers distinguish "I cancelled this" from "the network failed".
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, fallbackMessage(0));
  }

  if (!response.ok) throw await apiErrorFromResponse(response);
  return (await readBody(response)) as T;
}
