/**
 * Writes `dist/_headers` (Cloudflare Workers static assets) at build time: the security headers
 * for every page, and `noindex` for the admin.
 *
 * The Content-Security-Policy is derived, never hand-written: the API origin comes from
 * VITE_API_URL and each inline script in the *built* index.html is allowed by its SHA-256 hash,
 * so editing the theme script can't silently break it. Never hand-write `public/_headers`.
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Plugin } from "vite";

/** Turnstile (contact form and Pitch Me), when VITE_TURNSTILE_SITE_KEY is set. */
export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
// Cloudflare Web Analytics is off for the zone, so its origins are not allowed. If it is turned
// on, add https://static.cloudflareinsights.com to script-src and https://cloudflareinsights.com
// to connect-src. Rocket Loader must stay off: it rewrites script tags and runs inline code
// itself, which a hash-based CSP blocks.

const EXECUTABLE_TYPES = new Set(["", "text/javascript", "application/javascript", "module"]);

/**
 * `'sha256-…'` sources for every inline script the browser would execute. Scripts with `src`
 * are covered by their origin, and data blocks (JSON-LD) are never executed, so CSP ignores them.
 */
export function inlineScriptHashes(html: string): string[] {
  const hashes: string[] = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const [, attrs, body] = match;
    if (/\ssrc\s*=/i.test(` ${attrs}`)) continue;
    const type = /\stype\s*=\s*["']?([^"'\s>]+)/i.exec(` ${attrs}`)?.[1]?.toLowerCase() ?? "";
    if (!EXECUTABLE_TYPES.has(type)) continue;
    hashes.push(`'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`);
  }
  return hashes;
}

export interface CspInput {
  /** e.g. https://api.aashish-regmi.com.np */
  apiOrigin: string;
  /** From inlineScriptHashes(). */
  scriptHashes: string[];
}

/** The site's Content-Security-Policy, one directive per entry, in a stable order. */
export function contentSecurityPolicy({ apiOrigin, scriptHashes }: CspInput): string {
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    ["script-src", "'self'", ...scriptHashes, TURNSTILE_ORIGIN],
    ["style-src", "'self'"],
    // blob: for the admin's upload previews; data: for small inlined images.
    ["img-src", "'self'", "data:", "blob:", apiOrigin],
    ["font-src", "'self'"],
    ["connect-src", "'self'", apiOrigin],
    // The résumé PDF (served by the API's media route) and the Turnstile widget.
    ["frame-src", apiOrigin, TURNSTILE_ORIGIN],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
    ["upgrade-insecure-requests"],
  ];
  return directives.map((parts) => parts.join(" ")).join("; ");
}

export interface HeaderRule {
  path: string;
  headers: [name: string, value: string][];
}

export function headerRules(input: CspInput): HeaderRule[] {
  const noindex: HeaderRule["headers"] = [["X-Robots-Tag", "noindex, nofollow"]];
  return [
    {
      path: "/*",
      headers: [
        ["Content-Security-Policy", contentSecurityPolicy(input)],
        ["X-Content-Type-Options", "nosniff"],
        ["Referrer-Policy", "strict-origin-when-cross-origin"],
        ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()"],
        ["X-Frame-Options", "DENY"],
        ["Cross-Origin-Opener-Policy", "same-origin"],
        ["Strict-Transport-Security", "max-age=31536000"],
      ],
    },
    // No long-lived caching for /assets/*, although the file names are content-hashed: the
    // single-page-app fallback answers a *missing* file (an old chunk after a deploy) with
    // index.html and 200, which `immutable` would cache as that script for a year and break a
    // rollback to the build that used it. Workers' default (revalidate with ETag) stays.
    { path: "/admin", headers: noindex },
    { path: "/admin/*", headers: noindex },
  ];
}

/** The `_headers` file format: a path line, then indented `Name: value` lines. */
export function renderHeaders(rules: HeaderRule[]): string {
  return rules
    .map(({ path, headers }) => [path, ...headers.map(([name, value]) => `  ${name}: ${value}`)].join("\n"))
    .join("\n")
    .concat("\n");
}

export function headersPlugin(apiOrigin: string | null): Plugin {
  return {
    name: "portfolio-headers",
    apply: "build",
    writeBundle(options, bundle) {
      const index = bundle["index.html"];
      if (!index || index.type !== "asset") {
        this.error("index.html is missing from the bundle; can't derive the CSP script hashes.");
      }
      if (!apiOrigin) this.error("VITE_API_URL must be a valid URL to build the CSP.");
      const html = typeof index.source === "string" ? index.source : new TextDecoder().decode(index.source);
      const rules = headerRules({ apiOrigin, scriptHashes: inlineScriptHashes(html) });
      writeFileSync(join(options.dir ?? "dist", "_headers"), renderHeaders(rules));
    },
  };
}
