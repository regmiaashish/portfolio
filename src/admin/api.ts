/**
 * Admin API client. Every call sends the session cookies (`credentials: "include"`) and the
 * CSRF header the backend requires on mutating admin requests. A 401 triggers one silent
 * `POST /api/v1/auth/refresh`; if that fails too, listeners are told the session expired.
 */
import { ApiError, type RequestOptions, request } from "../lib/api";
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
  UploadRequest,
  UploadTicket,
} from "../lib/cmsContracts";

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

export async function adminRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await request<T>(path, baseOptions(options));
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
    if (await refreshSession()) {
      try {
        return await request<T>(path, baseOptions(options));
      } catch (retryError) {
        if (isUnauthorized(retryError)) expiryListeners.forEach((listener) => listener());
        throw retryError;
      }
    }
    expiryListeners.forEach((listener) => listener());
    throw error;
  }
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

  presignUpload: (upload: UploadRequest) =>
    adminRequest<UploadTicket>("/api/v1/admin/uploads", { method: "POST", body: upload }),

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

// --- Direct-to-S3 upload -----------------------------------------------------------

/**
 * Sends the file straight to S3 with the presigned POST (fields first, file last, as S3
 * requires). XMLHttpRequest rather than fetch because only XHR reports upload progress.
 */
export function uploadToS3(
  ticket: UploadTicket,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [name, value] of Object.entries(ticket.fields)) form.append(name, value);
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", ticket.url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(s3RejectionMessage(xhr.status, xhr.responseText)));
    };
    // No HTTP response at all: offline, or (most often) the bucket's CORS rules don't allow
    // this site's origin, so the browser blocks the request before S3 can answer.
    xhr.onerror = () =>
      reject(
        new Error(
          `The upload couldn't reach S3. Check your connection; if it persists, the bucket's CORS ` +
            `rules must allow POST from ${window.location.origin}.`,
        ),
      );
    xhr.send(form);
  });
}

const S3_HINTS: Record<string, string> = {
  AccessDenied: "the AWS key needs s3:PutObject on the upload folder, and the bucket policy must allow it",
  PermanentRedirect: "AWS_REGION on the server doesn't match the bucket's region",
  AuthorizationHeaderMalformed: "AWS_REGION on the server doesn't match the bucket's region",
  SignatureDoesNotMatch: "the AWS secret key on the server is wrong",
  InvalidAccessKeyId: "the AWS access key on the server is wrong or deleted",
  EntityTooLarge: "the file is larger than the upload limit",
  NoSuchBucket: "S3_BUCKET_NAME on the server doesn't exist",
};

/** Turns S3's XML error body into a message that says what to fix. */
export function s3RejectionMessage(status: number, body: string): string {
  const code = /<Code>([^<]+)<\/Code>/.exec(body)?.[1];
  const detail = /<Message>([^<]+)<\/Message>/.exec(body)?.[1];
  if (!code) return `The upload was rejected by S3 (HTTP ${status}). Please try again.`;
  const hint = S3_HINTS[code];
  return (
    `S3 rejected the upload: ${code}${detail ? ` (${detail})` : ""}.` +
    (hint ? ` Likely cause: ${hint}.` : "")
  );
}
