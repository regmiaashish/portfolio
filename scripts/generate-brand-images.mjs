// Renders the Open Graph image and the PNG icon set from the profile, with headless Chrome.
//   npm run gen:brand            (CHROME_PATH overrides /usr/bin/google-chrome)
// Outputs into public/: og-image.png (1200×630), apple-touch-icon.png (180), icon-192.png, icon-512.png.
// Re-run after changing the name, role, tagline or location in src/data/profile.ts.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// profile.ts is TypeScript: transpile it with esbuild (installed with Vite) and import the result.
async function loadProfile() {
  const result = await build({
    entryPoints: [join(root, "src/data/profile.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    write: false,
  });
  const dir = mkdtempSync(join(tmpdir(), "brand-profile-"));
  const file = join(dir, "profile.mjs");
  writeFileSync(file, result.outputFiles[0].text);
  try {
    return (await import(pathToFileURL(file).href)).profile;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const profile = await loadProfile();

const chrome = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const font = (pkg, file) =>
  pathToFileURL(join(root, "node_modules/@fontsource-variable", pkg, "files", file)).href;
const HEADING = font("bricolage-grotesque", "bricolage-grotesque-latin-wght-normal.woff2");
const BODY = font("public-sans", "public-sans-latin-wght-normal.woff2");

// Brand tokens (src/styles/tokens.css).
const INK = "#0f1e33";
const SNOW = "#f4f6f8";
const MUTED = "#a3b1c4";
const MARIGOLD = "#e8a317";

const escape = (text) =>
  String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const page = (width, height, body, css) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face { font-family: "Heading"; src: url("${HEADING}") format("woff2"); font-weight: 200 800; }
@font-face { font-family: "Body"; src: url("${BODY}") format("woff2"); font-weight: 100 900; }
html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; }
body { background: ${INK}; color: ${SNOW}; -webkit-font-smoothing: antialiased; }
${css}
</style></head><body>${body}</body></html>`;

const ogImage = page(
  1200,
  630,
  `<main>
    <p class="where"><span class="dot"></span>${escape(profile.location)}</p>
    <h1>${escape(profile.name)}</h1>
    <p class="role">${escape(profile.role)}</p>
    <p class="tagline">${escape(profile.tagline)}</p>
  </main>
  <footer>aashish-regmi.com.np</footer>
  <div class="bar"></div>`,
  `
  main { position: absolute; left: 88px; top: 92px; right: 88px; }
  .where { display: flex; align-items: center; gap: 14px; margin: 0; font: 500 28px/1 "Body";
           color: ${MUTED}; }
  .dot { width: 14px; height: 14px; border-radius: 50%; background: ${MARIGOLD}; }
  h1 { margin: 34px 0 0; font: 800 104px/1 "Heading"; letter-spacing: -0.03em; }
  .role { margin: 22px 0 0; font: 700 42px/1.15 "Heading"; color: ${MARIGOLD}; letter-spacing: -0.01em; }
  .tagline { margin: 30px 0 0; max-width: 900px; font: 400 34px/1.35 "Body"; color: ${SNOW}; }
  footer { position: absolute; left: 88px; bottom: 58px; font: 500 26px/1 "Body"; color: ${MUTED}; }
  .bar { position: absolute; left: 0; top: 0; bottom: 0; width: 16px; background: ${MARIGOLD}; }
`,
);

// One square template, rendered at each size. Monogram from the profile's initials.
const initials = profile.name
  .split(/\s+/)
  .map((part) => part[0])
  .join("")
  .slice(0, 2)
  .toUpperCase();
const icon = (size) =>
  page(
    size,
    size,
    `<div class="mark">${escape(initials)}</div><div class="rule"></div>`,
    `
    .mark { position: absolute; inset: 0; display: grid; place-items: center;
            font: 800 ${Math.round(size * 0.44)}px/1 "Heading"; letter-spacing: -0.04em;
            color: ${MARIGOLD}; padding-bottom: ${Math.round(size * 0.04)}px; }
    .rule { position: absolute; left: 30%; right: 30%; bottom: 21%; height: ${Math.max(2, Math.round(size * 0.035))}px;
            border-radius: 99px; background: ${SNOW}; opacity: 0.85; }
  `,
  );

const outputs = [
  ["og-image.png", 1200, 630, ogImage],
  ["apple-touch-icon.png", 180, 180, icon(180)],
  ["icon-192.png", 192, 192, icon(192)],
  ["icon-512.png", 512, 512, icon(512)],
];

const work = mkdtempSync(join(tmpdir(), "brand-"));
try {
  for (const [name, width, height, html] of outputs) {
    const file = join(work, `${name}.html`);
    writeFileSync(file, html);
    execFileSync(
      chrome,
      [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--allow-file-access-from-files",
        `--user-data-dir=${join(work, "profile")}`,
        `--window-size=${width},${height}`,
        "--virtual-time-budget=2000",
        `--screenshot=${join(root, "public", name)}`,
        pathToFileURL(file).href,
      ],
      { stdio: "ignore" },
    );
    console.log(`public/${name} (${width}×${height})`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
