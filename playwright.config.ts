import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests against the built site (`npm run e2e` builds it first), served with its generated
 * `_headers` so the real Content-Security-Policy is enforced. Locally they use the installed
 * Google Chrome (no browser download); CI installs Playwright's full Chromium (`--no-shell`), so
 * both run a real browser with a PDF viewer rather than the headless shell.
 */
const SITE_PORT = 4317;
const PITCH_PORT = 4318;
const channel = process.env.PLAYWRIGHT_CHANNEL ?? (process.env.CI ? "chromium" : "chrome");

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    channel,
    trace: "retain-on-failure",
    launchOptions: {
      // Every hostname except the local servers fails to resolve, so nothing the routing can't
      // see (a preconnect's DNS/TCP/TLS, Chrome's background services) reaches a real host.
      args: ["--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1"],
    },
  },
  projects: [
    { name: "site", testMatch: "smoke.spec.ts", use: { baseURL: `http://127.0.0.1:${SITE_PORT}` } },
    { name: "pitch", testMatch: "pitch.spec.ts", use: { baseURL: `http://127.0.0.1:${PITCH_PORT}` } },
  ],
  webServer: [
    {
      command: `node scripts/serve-dist.mjs --dir dist-e2e/site --port ${SITE_PORT}`,
      url: `http://127.0.0.1:${SITE_PORT}/`,
      reuseExistingServer: false,
    },
    {
      command: `node scripts/serve-dist.mjs --dir dist-e2e/pitch --port ${PITCH_PORT}`,
      url: `http://127.0.0.1:${PITCH_PORT}/`,
      reuseExistingServer: false,
    },
  ],
});
