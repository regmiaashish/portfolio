/**
 * Admin API client. Every call sends the session cookies (`credentials: "include"`) and the
 * CSRF header the backend requires on mutating admin requests. A 401 triggers one silent
 * `POST /api/v1/auth/refresh`; if that fails too, listeners are told the session expired.
 */
import {
  API_URL,
  ApiError,
  apiErrorFromResponse,
  errorCode,
  type RequestOptions,
  request,
} from "../lib/api";
import type {
  AdminCareerEntry,
  AdminContent,
  AdminProject,
  AdminSkillGroup,
  AdminUser,
  CareerInput,
  PitchOutcome,
  PitchRunDetail,
  PitchRunList,
  PitchStats,
  Profile,
  ProjectInput,
  SkillGroupInput,
  UploadedFile,
  UploadPurpose,
} from "../lib/cmsContracts";
import { safeFilename } from "./validation";

export const CSRF_HEADER = { "X-Requested-With": "portfolio-admin" } as const;

type Listener = () => void;
const expiryListeners = new Set<Listener>();

/** Called when the session can't be refreshed; returns an unsubscribe function. */
export function onSessionExpired(listener: Listener): () => void {
  expiryListeners.add(listener);
  return () => expiryListeners.delete(listener);
}

function baseOptions(options: RequestOptions): RequestOptions {
  return {
    ...options,
    withCredentials: true,
    headers: { ...CSRF_HEADER, ...options.headers },
  };
}

let refreshInFlight: Promise<boolean> | null = null;

/** One refresh at a time, however many requests hit 401 together. */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= request<unknown>("/api/v1/auth/refresh", baseOptions({ method: "POST" }))
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

function isUnauthorized(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401;
}

/** Runs `call`; on 401, refreshes the session once and retries, else reports expiry. */
async function withSessionRetry<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
    if (await refreshSession()) {
      try {
        return await call();
      } catch (retryError) {
        if (isUnauthorized(retryError)) expiryListeners.forEach((listener) => listener());
        throw retryError;
      }
    }
    expiryListeners.forEach((listener) => listener());
    throw error;
  }
}

export function adminRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return withSessionRetry(() => request<T>(path, baseOptions(options)));
}

// --- Session ---------------------------------------------------------------------

/** The signed-in user, or null when there is no valid session (after one refresh attempt). */
export async function fetchCurrentUser(): Promise<AdminUser | null> {
  const load = () =>
    request<{ data: AdminUser }>("/api/v1/auth/me", baseOptions({})).then((body) => body.data);
  try {
    return await load();
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
    if (!(await refreshSession())) return null;
    try {
      return await load();
    } catch (retryError) {
      if (isUnauthorized(retryError)) return null;
      throw retryError;
    }
  }
}

export function login(email: string, password: string): Promise<unknown> {
  return request("/api/v1/auth/login", baseOptions({ method: "POST", body: { email, password } }));
}

export function logout(): Promise<unknown> {
  return request("/api/v1/auth/logout", baseOptions({ method: "POST" }));
}

// --- Content ---------------------------------------------------------------------

export const adminApi = {
  content: () => adminRequest<AdminContent>("/api/v1/admin/content"),
  saveProfile: (profile: Profile) =>
    adminRequest<Profile>("/api/v1/admin/profile", { method: "PUT", body: profile }),

  createProject: (input: ProjectInput) =>
    adminRequest<AdminProject>("/api/v1/admin/projects", { method: "POST", body: input }),
  updateProject: (id: string, input: ProjectInput) =>
    adminRequest<AdminProject>(`/api/v1/admin/projects/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: input,
    }),
  deleteProject: (id: string) =>
    adminRequest<void>(`/api/v1/admin/projects/${encodeURIComponent(id)}`, { method: "DELETE" }),
  orderProjects: (ids: string[]) =>
    adminRequest<void>("/api/v1/admin/projects/order", { method: "PUT", body: { ids } }),

  createCareer: (input: CareerInput) =>
    adminRequest<AdminCareerEntry>("/api/v1/admin/career", { method: "POST", body: input }),
  updateCareer: (id: string, input: CareerInput) =>
    adminRequest<AdminCareerEntry>(`/api/v1/admin/career/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: input,
    }),
  deleteCareer: (id: string) =>
    adminRequest<void>(`/api/v1/admin/career/${encodeURIComponent(id)}`, { method: "DELETE" }),
  orderCareer: (ids: string[]) =>
    adminRequest<void>("/api/v1/admin/career/order", { method: "PUT", body: { ids } }),

  createSkillGroup: (input: SkillGroupInput) =>
    adminRequest<AdminSkillGroup>("/api/v1/admin/skills", { method: "POST", body: input }),
  updateSkillGroup: (id: string, input: SkillGroupInput) =>
    adminRequest<AdminSkillGroup>(`/api/v1/admin/skills/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: input,
    }),
  deleteSkillGroup: (id: string) =>
    adminRequest<void>(`/api/v1/admin/skills/${encodeURIComponent(id)}`, { method: "DELETE" }),
  orderSkillGroups: (ids: string[]) =>
    adminRequest<void>("/api/v1/admin/skills/order", { method: "PUT", body: { ids } }),

  pitchStats: (signal?: AbortSignal) =>
    adminRequest<PitchStats>("/api/v1/admin/pitches/stats", { signal }),
  listPitches: (query: PitchListQuery, signal?: AbortSignal) =>
    adminRequest<PitchRunList>(`/api/v1/admin/pitches?${pitchListParams(query)}`, { signal }),
  getPitch: (id: string, signal?: AbortSignal) =>
    adminRequest<PitchRunDetail>(`/api/v1/admin/pitches/${encodeURIComponent(id)}`, { signal }),
  deletePitch: (id: string) =>
    adminRequest<void>(`/api/v1/admin/pitches/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export interface PitchListQuery {
  limit: number;
  offset: number;
  q?: string;
  outcome?: PitchOutcome;
}

/** Query string for the pitch list; empty search and filter are left out. */
export function pitchListParams({ limit, offset, q, outcome }: PitchListQuery): string {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const search = q?.trim();
  if (search) params.set("q", search);
  if (outcome) params.set("outcome", outcome);
  return params.toString();
}

// --- Uploads through the API ------------------------------------------------------

export const UPLOAD_PATH = "/api/v1/admin/uploads/file";

export const UPLOAD_NETWORK_MESSAGE =
  "The upload couldn't reach the server. Check your connection and try again.";

/** One multipart POST to the API, which stores the file in S3 server-side. */
function sendUpload(
  file: File,
  purpose: UploadPurpose,
  onProgress?: (fraction: number) => void,
): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("purpose", purpose);
    form.append("file", file, safeFilename(file.name));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}${UPLOAD_PATH}`);
    xhr.withCredentials = true;
    for (const [name, value] of Object.entries(CSRF_HEADER)) xhr.setRequestHeader(name, value);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadedFile);
        } catch {
          reject(new ApiError(xhr.status, "The server sent an unexpected response."));
        }
        return;
      }
      // Same error parsing as every other API call (message + field errors + code).
      const status = xhr.status >= 200 && xhr.status <= 599 ? xhr.status : 500;
      apiErrorFromResponse(new Response(xhr.responseText || null, { status })).then(reject, () =>
        reject(new ApiError(status, "The upload failed.")),
      );
    };
    xhr.onerror = () => reject(new ApiError(0, UPLOAD_NETWORK_MESSAGE));
    xhr.send(form);
  });
}

/**
 * Uploads a file through the API (XMLHttpRequest, because only XHR reports upload progress).
 * Sends the session cookies and the CSRF header; a 401 refreshes the session once, like
 * adminRequest.
 */
export function uploadViaApi(
  file: File,
  purpose: UploadPurpose,
  onProgress?: (fraction: number) => void,
): Promise<UploadedFile> {
  return withSessionRetry(() => sendUpload(file, purpose, onProgress));
}

/** What to show for a failed upload: the server's field error on `file` when it sent one. */
export function uploadErrorMessage(reason: unknown, notConfigured: string): string {
  if (reason instanceof ApiError) {
    if (errorCode(reason) === "uploads_disabled") return notConfigured;
    if (Array.isArray(reason.errors)) {
      for (const item of reason.errors) {
        if (!item || typeof item !== "object") continue;
        const { loc, msg } = item as { loc?: unknown; msg?: unknown };
        if (Array.isArray(loc) && loc[loc.length - 1] === "file" && typeof msg === "string") {
          return msg.replace(/^Value error, /, "");
        }
      }
    }
    return reason.message;
  }
  return reason instanceof Error ? reason.message : "The upload failed.";
}
