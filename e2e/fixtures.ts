/**
 * Shared setup for the smoke tests. Every request leaves the browser through one route handler
 * that is installed before the first navigation:
 *
 * - the local static server is allowed through;
 * - the API origin is answered from the fixtures below (the build points at the real API URL so
 *   the generated CSP is the production one, and Playwright intercepts after CSP checks);
 * - everything else is aborted, so no test can reach a real service.
 *
 * Routing only sees HTTP requests. Connections the browser opens on its own (DNS, TCP and TLS for
 * a preconnect, Chrome's background services) are stopped by `--host-resolver-rules` in
 * playwright.config.ts, which makes every hostname except 127.0.0.1 unresolvable; the e2e build
 * also leaves out the API preconnect.
 *
 * Each test fails on any unmocked API call, console error, page error or CSP violation.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, type Request, type Route, test as base } from "@playwright/test";

import { contentSnapshot } from "../src/data/snapshot";
import type { SiteContent } from "../src/lib/cmsContracts";

export const API_ORIGIN = "https://api.aashish-regmi.com.np";
export const MEDIA = `${API_ORIGIN}/api/v1/media/portfolio`;
export const RESUME_URL = `${MEDIA}/resume/0f6c2d1e-2b1c-4a57-9d43-7c1f0e3a9b21.pdf`;
const PROJECT_IMAGE_URL = `${MEDIA}/projects/5b1c7c2e-8f0a-4d7e-9a51-3e2b6f1d0c44.png`;

/** What GET /api/v1/content returns: the snapshot plus an API-only project, so tests can tell. */
export const apiContent: SiteContent = {
  ...contentSnapshot,
  profile: { ...contentSnapshot.profile, resume_url: RESUME_URL },
  projects: [
    ...contentSnapshot.projects,
    {
      ...contentSnapshot.projects[0],
      id: "api-e2e-project",
      slug: "e2e-api-project",
      name: "Served by the API",
      image: { url: PROJECT_IMAGE_URL, alt: "API project screenshot", width: 192, height: 192 },
      case_study: null,
    },
  ],
  updated_at: "2026-10-14T10:00:00Z",
};

const PNG = readFileSync(join(process.cwd(), "public", "icon-192.png"));
const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj " +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

export const pitchStream = [
  ["agent", { agent: "researcher", status: "running" }],
  ["log", { agent: "researcher", message: "Reading about Example Corp" }],
  ["agent", { agent: "researcher", status: "done" }],
  ["agent", { agent: "matchmaker", status: "running" }],
  ["agent", { agent: "matchmaker", status: "done" }],
  ["agent", { agent: "writer", status: "running" }],
  ["token", { text: "Aashish builds reliable backends " }],
  ["token", { text: "for Example Corp." }],
  ["agent", { agent: "writer", status: "done" }],
  ["done", { cached: false }],
]
  .map(([event, data]) => `event: ${event as string}\ndata: ${JSON.stringify(data)}\n\n`)
  .join("");

const json = (status: number, body: unknown) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

/** Like the API: the exact allowed origin, with credentials (the admin sends cookies). */
const cors = (request: Request) => ({
  "access-control-allow-origin": request.headers()["origin"] ?? "*",
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type, x-requested-with",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  vary: "Origin",
});

type Handler = (request: Request) => Parameters<Route["fulfill"]>[0];

const API_ROUTES: Record<string, Handler> = {
  "GET /health": () => json(200, { status: "ok" }),
  "GET /api/v1/content": () => json(200, apiContent),
  "GET /api/v1/context": () =>
    json(200, {
      city: "Kathmandu",
      country: "Nepal",
      country_code: "NP",
      timezone: "Asia/Kathmandu",
      base_currency: "GBP",
    }),
  "POST /api/v1/contact": () => json(202, { success: true, message: "Thanks! Your message is on its way." }),
  "GET /api/v1/auth/me": () => json(401, { success: false, message: "Not authenticated.", errors: null }),
  "POST /api/v1/auth/refresh": () => json(401, { success: false, message: "Not authenticated.", errors: null }),
  "GET /api/v1/pitch/stream": () => ({ status: 200, contentType: "text/event-stream", body: pitchStream }),
  [`GET ${new URL(RESUME_URL).pathname}`]: () => ({ status: 200, contentType: "application/pdf", body: PDF }),
  [`GET ${new URL(PROJECT_IMAGE_URL).pathname}`]: () => ({ status: 200, contentType: "image/png", body: PNG }),
};

export interface Guard {
  /** Requests the app sent to the API, as "METHOD /path". */
  apiCalls: string[];
  /** Request bodies by "METHOD /path". */
  bodies: Map<string, unknown>;
  problems: string[];
}

async function install(page: Page, guard: Guard, baseURL: string): Promise<void> {
  const local = new URL(baseURL).origin;

  await page.context().route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    // The local server, and the browser's own pages (Chrome's PDF viewer is an extension).
    if (url.origin === local || url.protocol === "chrome-extension:") return route.continue();
    if (url.origin !== API_ORIGIN) {
      guard.problems.push(`blocked external request: ${request.method()} ${url.href}`);
      return route.abort("blockedbyclient");
    }
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors(request) });
    const key = `${request.method()} ${url.pathname}`;
    guard.apiCalls.push(key);
    const body = request.postData();
    if (body) {
      try {
        guard.bodies.set(key, JSON.parse(body));
      } catch {
        // Answer at once rather than leaving the request hanging until the test times out.
        guard.problems.push(`non-JSON request body: ${key}`);
        return route.fulfill({ ...json(400, { success: false, message: "bad body", errors: null }), headers: cors(request) });
      }
    }
    const handler = API_ROUTES[key];
    if (!handler) {
      guard.problems.push(`unmocked API call: ${key}`);
      return route.fulfill(json(500, { success: false, message: "unmocked", errors: null }));
    }
    const response = handler(request);
    return route.fulfill({ ...response, headers: { ...cors(request), ...response?.headers } });
  });

  // CSP violations are reported as events; console errors cover the rest.
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      console.error(`CSP violation: ${event.violatedDirective} blocked ${event.blockedURI || "inline"}`);
    });
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    // Chrome logs every 401 as an error; signed-out admin checks (/auth/me, /auth/refresh) expect them.
    if (/status of 401 \(Unauthorized\)/.test(message.text())) return;
    guard.problems.push(`console error: ${message.text()}`);
  });
  page.on("pageerror", (error) => guard.problems.push(`page error: ${error.message}`));
}

export const test = base.extend<{ guard: Guard }>({
  guard: [
    async ({ page, baseURL }, use) => {
      const guard: Guard = { apiCalls: [], bodies: new Map(), problems: [] };
      await install(page, guard, baseURL ?? "http://127.0.0.1:4317");
      await use(guard);
      expect(guard.problems, "unexpected requests, console errors or CSP violations").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Fails if the page scrolls sideways at the current viewport width. */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(0);
}
