// Serves a built site the way Cloudflare Workers static assets do, for the Playwright smoke
// tests: files from the build directory, the single-page-app fallback to index.html, and the
// headers from its generated `_headers` file (only the syntax vite/headers.ts writes: exact
// paths and a trailing `*` splat).
//
//   node scripts/serve-dist.mjs [--dir dist] [--port 4317]
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: { dir: { type: "string", default: "dist" }, port: { type: "string", default: "4317" } },
});
const root = resolve(values.dir);
const port = Number(values.port);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
};

/** [{ pattern: RegExp, headers: [name, value][] }] from `_headers`. */
function parseHeaders(text) {
  const rules = [];
  for (const line of text.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      const escaped = line.trim().replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
      rules.push({ pattern: new RegExp(`^${escaped}$`), headers: [] });
    } else {
      const at = line.indexOf(":");
      rules.at(-1)?.headers.push([line.slice(0, at).trim(), line.slice(at + 1).trim()]);
    }
  }
  return rules;
}

const headersFile = join(root, "_headers");
if (!existsSync(headersFile)) {
  console.error(`${headersFile} is missing: build first (vite/headers.ts writes it).`);
  process.exit(1);
}
const rules = parseHeaders(readFileSync(headersFile, "utf8"));

function fileFor(pathname) {
  const target = normalize(join(root, pathname));
  if (target !== root && !target.startsWith(root + sep)) return null; // no path traversal
  if (existsSync(target) && statSync(target).isFile()) return target;
  return null;
}

/** Matching rules' headers; a name set by several rules is joined with ", ", as Cloudflare does. */
function headersFor(pathname) {
  const merged = new Map();
  for (const rule of rules) {
    if (!rule.pattern.test(pathname)) continue;
    for (const [name, value] of rule.headers) {
      const key = name.toLowerCase();
      const previous = merged.get(key);
      merged.set(key, previous ? [previous[0], `${previous[1]}, ${value}`] : [name, value]);
    }
  }
  return [...merged.values()];
}

createServer((req, res) => {
  const { pathname: raw } = new URL(req.url ?? "/", "http://localhost");
  let pathname;
  try {
    pathname = decodeURIComponent(raw);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain" }).end("Bad request");
    return;
  }
  let file = fileFor(pathname);
  let status = 200;
  if (pathname === "/_headers") {
    // The headers file configures the server; it is never served.
    file = null;
    status = 404;
  } else if (!file) {
    // Routes get index.html, like `not_found_handling: "single-page-application"`. Missing files
    // deliberately 404 here, although Cloudflare answers them with index.html too (see
    // vite/headers.ts): a broken asset reference then fails the tests loudly.
    if (extname(pathname)) status = 404;
    else file = join(root, "index.html");
  }
  for (const [name, value] of headersFor(raw)) res.setHeader(name, value);
  if (status === 404 || !file) {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
    return;
  }
  res.writeHead(status, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  if (req.method === "HEAD") res.end();
  else createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} on http://127.0.0.1:${port}`);
});
