import { vi } from "vitest";

import { contentSnapshot } from "../data/snapshot";
import type { AdminContent, AdminUser } from "../lib/cmsContracts";
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

/** Records presigned-POST uploads instead of sending them. */
export class FakeXHR {
  static instances: FakeXHR[] = [];
  static status = 204;
  method = "";
  url = "";
  body: FormData | null = null;
  status = 0;
  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  send(body: FormData) {
    this.body = body;
    FakeXHR.instances.push(this);
    queueMicrotask(() => {
      this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
      this.status = FakeXHR.status;
      this.onload?.();
    });
  }
}

export function installFakeXHR() {
  FakeXHR.instances = [];
  FakeXHR.status = 204;
  vi.stubGlobal("XMLHttpRequest", FakeXHR);
}
