import { vi } from "vitest";

import { contentSnapshot } from "../data/snapshot";
import type {
  AdminContent,
  AdminUser,
  MessageDetail,
  MessageStats,
  MessageStatus,
  MessageSummary,
  PitchOutcome,
  PitchRunDetail,
  PitchRunSummary,
  PitchStats,
} from "../lib/cmsContracts";
import { jsonResponse, mockApi } from "./fetch";

type Handler = Parameters<typeof mockApi>[0][string];

export const ADMIN_USER: AdminUser = {
  id: "00000000-0000-4000-8000-0000000000aa",
  name: "Aashish Regmi",
  email: "admin@example.com",
  is_active: true,
  is_superuser: true,
};

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** Admin content as the backend returns it: ids, positions, published flags, image keys. */
export function adminContentFixture(): AdminContent {
  return {
    profile: structuredClone(contentSnapshot.profile),
    projects: contentSnapshot.projects.slice(0, 3).map((project, index) => ({
      ...structuredClone(project),
      id: uuid(index + 1),
      published: index !== 2,
      position: index,
      image: project.image
        ? { ...project.image, url: "https://cdn.example.com/portfolio/projects/a.png", key: "portfolio/projects/a.png" }
        : null,
    })),
    career: contentSnapshot.career.map((entry, index) => ({ ...entry, id: uuid(100 + index), position: index })),
    skills: contentSnapshot.skills.map((group, index) => ({ ...group, id: uuid(200 + index), position: index })),
    updated_at: "2026-10-14T10:00:00Z",
  };
}

const unauthorized = () =>
  jsonResponse(401, { success: false, message: "Not authenticated.", errors: null });

/**
 * Mocks the admin backend. Signed in by default; pass handlers to override any route.
 * Returns the fetch mock plus helpers to inspect calls.
 */
export function mockAdminApi(
  overrides: Record<string, Handler> = {},
  { signedIn = true, user = ADMIN_USER }: { signedIn?: boolean; user?: AdminUser } = {},
) {
  const content = adminContentFixture();
  const fetchMock = mockApi({
    "GET /api/v1/content": () => jsonResponse(503, { success: false, message: "x", errors: null }),
    "GET /api/v1/auth/me": () =>
      signedIn ? jsonResponse(200, { success: true, message: "ok", data: user }) : unauthorized(),
    "POST /api/v1/auth/refresh": unauthorized,
    "POST /api/v1/auth/logout": () => jsonResponse(200, { success: true, message: "ok", data: null }),
    "GET /api/v1/admin/content": () => jsonResponse(200, content),
    "GET /api/v1/admin/messages/stats": () => jsonResponse(200, messageStatsFixture({ unread: 0 })),
    ...overrides,
  });

  const calls = (method: string, path: string) =>
    fetchMock.mock.calls
      .filter(([input, init]) => {
        const url = new URL(String(input));
        return url.pathname === path && (init?.method ?? "GET").toUpperCase() === method;
      })
      .map(([, init]) => ({
        init: init as RequestInit,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
        headers: (init?.headers ?? {}) as Record<string, string>,
      }));

  return { fetchMock, content, calls };
}

/** The API's 201 body for `POST /api/v1/admin/uploads/file` (an image by default). */
export const UPLOADED_IMAGE = {
  key: "portfolio/projects/3f2a.png",
  public_url: "https://portfolio-bucket.s3.ap-south-1.amazonaws.com/portfolio/projects/3f2a.png",
  content_type: "image/png",
  size: 2048,
};

/** Records multipart uploads to the API instead of sending them. */
export class FakeXHR {
  static instances: FakeXHR[] = [];
  static status = 201;
  static responseBody: unknown = UPLOADED_IMAGE;
  static networkError = false;
  /** Per-request responses, used in order before falling back to status/responseBody. */
  static queue: { status: number; body: unknown }[] = [];
  method = "";
  url = "";
  body: FormData | null = null;
  status = 0;
  responseText = "";
  withCredentials = false;
  headers: Record<string, string> = {};
  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  send(body: FormData) {
    this.body = body;
    FakeXHR.instances.push(this);
    queueMicrotask(() => {
      if (FakeXHR.networkError) {
        this.onerror?.();
        return;
      }
      this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
      const next = FakeXHR.queue.shift() ?? { status: FakeXHR.status, body: FakeXHR.responseBody };
      this.status = next.status;
      this.responseText = next.body === undefined ? "" : JSON.stringify(next.body);
      this.onload?.();
    });
  }
}

export function installFakeXHR() {
  FakeXHR.instances = [];
  FakeXHR.status = 201;
  FakeXHR.responseBody = UPLOADED_IMAGE;
  FakeXHR.networkError = false;
  FakeXHR.queue = [];
  vi.stubGlobal("XMLHttpRequest", FakeXHR);
}

// --- Pitch history -----------------------------------------------------------------

const OUTCOME_CYCLE: PitchOutcome[] = [
  "completed",
  "cached",
  "timeout",
  "upstream_error",
  "internal_error",
  "disconnected",
];

/** `count` runs, newest first, cycling through every outcome. */
export function pitchRunsFixture(count: number, start = 0): PitchRunSummary[] {
  return Array.from({ length: count }, (_, i) => {
    const n = start + i;
    return {
      id: uuid(500 + n),
      company: n === 0 ? "Spotify" : `Company ${n}`,
      role: n === 0 ? "Backend engineer" : `Role ${n}`,
      outcome: OUTCOME_CYCLE[n % OUTCOME_CYCLE.length],
      duration_ms: 1850 + n,
      estimated_cost_usd: n % 6 === 1 ? 0 : 0.0082,
      created_at: new Date(Date.UTC(2026, 9, 14, 12, 0) - n * 60_000).toISOString(),
      preview: `Hi ${n === 0 ? "Spotify" : `Company ${n}`}, I'm Aashish, a backend engineer…`,
    };
  });
}

export function pitchDetailFixture(overrides: Partial<PitchRunDetail> = {}): PitchRunDetail {
  const [summary] = pitchRunsFixture(1);
  return {
    id: summary.id,
    company: summary.company,
    role: summary.role,
    outcome: "completed",
    pitch_text: "Hi Spotify, I'm Aashish.\nI build backends that stay up.",
    error_code: null,
    duration_ms: 1853,
    input_tokens: 120,
    output_tokens: 45,
    searches: 1,
    estimated_cost_usd: 0.0082,
    created_at: summary.created_at,
    ...overrides,
  };
}

export function pitchStatsFixture(overrides: Partial<PitchStats> = {}): PitchStats {
  return {
    enabled: true,
    daily_cap: 100,
    today: { paid_runs: 12, cached: 3, failed: 1 },
    last_30_days: { runs: 140, cached: 30, failed: 6, estimated_cost_usd: 0.0164 },
    ...overrides,
  };
}

/** Admin API mock with a paginated pitch list of `total` runs (honours limit/offset). */
export function mockPitchApi(
  total: number,
  overrides: Parameters<typeof mockAdminApi>[0] = {},
) {
  const all = pitchRunsFixture(total);
  return mockAdminApi({
    "GET /api/v1/admin/pitches/stats": () => jsonResponse(200, pitchStatsFixture()),
    "GET /api/v1/admin/pitches": (_init, url) => {
      const limit = Number(url.searchParams.get("limit") ?? 20);
      const offset = Number(url.searchParams.get("offset") ?? 0);
      return jsonResponse(200, { items: all.slice(offset, offset + limit), total, limit, offset });
    },
    ...overrides,
  });
}

// --- Contact messages ---------------------------------------------------------------

const STATUS_CYCLE: MessageStatus[] = ["sent", "pending", "failed"];

/** `count` messages, newest first: every other one unread, cycling delivery statuses. */
export function messagesFixture(count: number, start = 0): MessageSummary[] {
  return Array.from({ length: count }, (_, i) => {
    const n = start + i;
    return {
      id: uuid(800 + n),
      name: n === 0 ? "Jane Doe" : `Sender ${n}`,
      email: n === 0 ? "jane@example.com" : `sender${n}@example.com`,
      preview: n === 0 ? "Hi Aashish, we'd love to talk about a backend role…" : `Message ${n}`,
      status: STATUS_CYCLE[n % STATUS_CYCLE.length],
      read: n % 2 === 1,
      created_at: new Date(Date.UTC(2026, 9, 14, 12, 0) - n * 3_600_000).toISOString(),
    };
  });
}

export function messageDetailFixture(overrides: Partial<MessageDetail> = {}): MessageDetail {
  const [summary] = messagesFixture(1);
  return {
    id: summary.id,
    name: summary.name,
    email: summary.email,
    message: "Hi Aashish,\nwe'd love to talk about a backend role.",
    status: "sent",
    error: null,
    read: false,
    read_at: null,
    created_at: summary.created_at,
    ...overrides,
  };
}

export function messageStatsFixture(overrides: Partial<MessageStats> = {}): MessageStats {
  return { unread: 3, failed: 1, total: 12, last_7_days: 5, ...overrides };
}

/** Admin API mock with a paginated message list of `total` messages (honours limit/offset). */
export function mockMessagesApi(total: number, overrides: Parameters<typeof mockAdminApi>[0] = {}) {
  const all = messagesFixture(total);
  return mockAdminApi({
    "GET /api/v1/admin/messages/stats": () => jsonResponse(200, messageStatsFixture()),
    "GET /api/v1/admin/messages": (_init, url) => {
      const limit = Number(url.searchParams.get("limit") ?? 20);
      const offset = Number(url.searchParams.get("offset") ?? 0);
      return jsonResponse(200, { items: all.slice(offset, offset + limit), total, limit, offset });
    },
    ...overrides,
  });
}
