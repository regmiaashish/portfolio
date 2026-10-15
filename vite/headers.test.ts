/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  contentSecurityPolicy,
  headerRules,
  inlineScriptHashes,
  renderHeaders,
  TURNSTILE_ORIGIN,
} from "./headers";

const API = "https://api.example.test";

const directive = (csp: string, name: string) =>
  csp
    .split("; ")
    .find((part) => part === name || part.startsWith(`${name} `))
    ?.split(" ")
    .slice(1);

describe("inlineScriptHashes", () => {
  it("hashes executable inline scripts exactly as the browser does", () => {
    expect(inlineScriptHashes("<script>alert(1)</script>")).toEqual([
      "'sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI='",
    ]);
    expect(inlineScriptHashes('<script type="module">alert(1)</script>')).toHaveLength(1);
    expect(inlineScriptHashes("<SCRIPT type='text/javascript'>alert(1)</SCRIPT>")).toHaveLength(1);
  });

  it("skips external scripts and data blocks such as JSON-LD", () => {
    const html = [
      '<script type="module" crossorigin src="/assets/index.js"></script>',
      '<script type="application/ld+json">{"@type":"Person"}</script>',
    ].join("\n");
    expect(inlineScriptHashes(html)).toEqual([]);
  });
});

describe("contentSecurityPolicy", () => {
  const csp = contentSecurityPolicy({ apiOrigin: API, scriptHashes: ["'sha256-abc='"] });

  it("allows the API only where the site uses it", () => {
    expect(directive(csp, "connect-src")).toContain(API);
    expect(directive(csp, "img-src")).toContain(API);
    expect(directive(csp, "frame-src")).toEqual([API, TURNSTILE_ORIGIN]);
    expect(directive(csp, "script-src")).not.toContain(API);
  });

  it("allows no third-party scripts or endpoints beyond Turnstile", () => {
    // Cloudflare Web Analytics is off for the zone; enabling it means adding its two origins.
    expect(directive(csp, "script-src")).toEqual(["'self'", "'sha256-abc='", TURNSTILE_ORIGIN]);
    expect(directive(csp, "connect-src")).toEqual(["'self'", API]);
    expect(csp).not.toContain("cloudflareinsights");
  });

  it("never allows inline code or eval except by hash", () => {
    expect(directive(csp, "script-src")).toContain("'sha256-abc='");
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("locks down plugins, framing, base and form targets", () => {
    expect(directive(csp, "object-src")).toEqual(["'none'"]);
    expect(directive(csp, "frame-ancestors")).toEqual(["'none'"]);
    expect(directive(csp, "base-uri")).toEqual(["'self'"]);
    expect(directive(csp, "form-action")).toEqual(["'self'"]);
    expect(directive(csp, "upgrade-insecure-requests")).toEqual([]);
  });
});

describe("index.html", () => {
  it("has every inline script it would execute covered by a CSP hash", () => {
    const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
    // An independent HTML parser decides what counts as an executable inline script.
    const doc = new DOMParser().parseFromString(html, "text/html");
    const executable = [...doc.querySelectorAll("script")].filter(
      (script) => !script.src && ["", "text/javascript", "module"].includes(script.type.toLowerCase()),
    );
    expect(executable.length).toBeGreaterThan(0); // the theme script

    const scriptSrc = directive(
      contentSecurityPolicy({ apiOrigin: API, scriptHashes: inlineScriptHashes(html) }),
      "script-src",
    );
    for (const script of executable) {
      const hash = createHash("sha256").update(script.textContent ?? "", "utf8").digest("base64");
      expect(scriptSrc).toContain(`'sha256-${hash}'`);
    }
  });
});

describe("renderHeaders", () => {
  it("writes the _headers format with security headers on every page", () => {
    const text = renderHeaders(headerRules({ apiOrigin: API, scriptHashes: [] }));
    expect(text).toMatch(/^\/\*\n {2}Content-Security-Policy: default-src 'self'; /);
    for (const header of [
      "X-Content-Type-Options: nosniff",
      "Referrer-Policy: strict-origin-when-cross-origin",
      "X-Frame-Options: DENY",
      "Cross-Origin-Opener-Policy: same-origin",
      "Strict-Transport-Security: max-age=31536000",
    ]) {
      expect(text).toContain(`  ${header}\n`);
    }
    expect(text).toContain("/admin/*\n  X-Robots-Tag: noindex, nofollow\n");
  });

  it("never marks /assets/* immutable", () => {
    // The SPA fallback answers a missing chunk (an old one after a deploy) with index.html and
    // 200; an immutable rule would cache that HTML as the script for a year and break rollbacks.
    const rules = headerRules({ apiOrigin: API, scriptHashes: [] });
    expect(rules.map((rule) => rule.path)).not.toContain("/assets/*");
    expect(renderHeaders(rules)).not.toMatch(/immutable|Cache-Control/);
  });
});
