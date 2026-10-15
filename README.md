# Aashish Regmi: portfolio frontend

The portfolio site of Aashish Regmi, a backend and AI engineer in Kathmandu. It is a small,
fast, accessible React app. The live features, a visitor Context Engine greeting (Phase 3) and
the Pitch Me multi-agent demo (Phase 4), are served by the separate FastAPI backend and arrive in
later phases; this repo currently ships the app shell, design system and content.

## Stack

- React 19, TypeScript 5.9, Vite 8 (Node 22.13+ or 24, which eslint 10 and vitest 5 need; `.nvmrc` pins Node 22 for CI and
  Cloudflare Workers Builds)
- react-router 7 (`/work/:slug` case-study pages)
- CSS Modules on top of design tokens in `src/styles/tokens.css`
- Self-hosted fonts: Bricolage Grotesque (headings) and Public Sans (body) via `@fontsource-variable`
- Vitest 5 + Testing Library (jsdom)
- ESLint 10 with typescript-eslint, react-hooks 7 (React Compiler rules) and
  `eslint-plugin-jsx-a11y-x` (the maintained fork of jsx-a11y that supports ESLint 10)

## Getting started

```bash
npm ci
npm run dev
```

In development the app calls the backend at `http://localhost:8001` (set in the committed
`.env.development`). Start the backend from its own repo with `make dev`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | ESLint, failing on any warning |
| `npm run test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run check` | Typecheck, lint and test |
| `npm run e2e` | Build the two smoke-test sites (`npm run e2e:build`) and run the Playwright smoke tests in a real browser |
| `npm run gen:api` | Regenerate `src/lib/api-types.ts` from the backend's OpenAPI schema |
| `npm run gen:brand` | Regenerate `public/og-image.png` and the PNG icons from `src/data/profile.ts` (needs Google Chrome; `CHROME_PATH` overrides `/usr/bin/google-chrome`) |

`gen:api` reads `http://localhost:8001/openapi.json` by default, so the backend must be running
with `ENV=dev` (the schema is hidden in production). To use another source, set `OPENAPI_URL`, for
example `OPENAPI_URL=./openapi.json npm run gen:api`.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | Yes | Base URL of the backend, no trailing slash. `vite build` fails if it is missing. |
| `VITE_TURNSTILE_SITE_KEY` | No | Cloudflare Turnstile site key. When set, the contact form shows the Turnstile check and sends its token; when unset (local development, tests), the form works without it. The backend's `TURNSTILE_SECRET` must be set to the matching secret. |
| `VITE_SITE_URL` | No | Public origin used for canonical and Open Graph URLs. Defaults to `https://aashish-regmi.com.np`. |
| `VITE_PITCH_ENABLED` | No | Set to `true` to turn on the live Pitch Me demo. Anything else (or unset) keeps the disabled "coming soon" panel, and nothing calls the pitch endpoint. Enable it only once the backend's Pitch Me cost controls are live (`PITCH_ENABLED=true`, Turnstile, daily cap). |

Development uses `.env.development`. Production builds read `.env.production` (not committed) or
the build environment, e.g. `VITE_API_URL=https://api.aashish-regmi.com.np`.

## Project structure

```
src/
├── app/          App shell: router, layout, theme provider, error boundary, scroll handling
├── pages/        Route pages: home, case study, not found
├── components/
│   ├── layout/   Container, Section, Stack, Grid, Header, Footer
│   ├── ui/       Button, Input, Textarea, Chip, StatusDot, Icon
│   └── sections/ Home page sections: Hero, Pitch panel, Work, Stack, Career, Contact
├── data/         Site content: profile, projects, career, skills
├── hooks/        useTheme, useDocumentTitle
├── lib/          api.ts (the only HTTP client) and generated api-types.ts
├── styles/       tokens.css, base.css and the contrast test
└── test/         Test setup and the renderApp helper
```

## Design system

- Palette: ink navy with Kathmandu marigold as the single accent. On light surfaces marigold is
  only used as a fill (primary button, selection), never as text or thin outlines.
- Themes: light and dark follow the system preference; the header toggle overrides it and is
  remembered. Choosing the system's own theme returns to following the system.
- Contrast: every text and UI colour pair meets WCAG AA in both themes, enforced by
  `src/styles/contrast.test.ts`.
- Type scale: 14 / 17 / 21 / 28 / 40 / 64, with fluid headings.
- Radius scale: 4px inputs, 8px panels, 999px pills.
- Motion is minimal and honours `prefers-reduced-motion`.

## Routes

| Path | Page |
|---|---|
| `/` | Home: hero, pitch panel, work, stack, career, contact |
| `/work/:slug` | Project case study |
| `/admin` | Content admin (lazy-loaded, `noindex`): profile, projects, career, skills, image uploads |
| anything else | Not found |

Public pages read content from `GET /api/v1/content` and fall back to the snapshot bundled from
`src/data/*` if the API is unavailable, so the site never renders empty. The admin signs in with
the backend's super-admin account (HttpOnly cookies), so the API's `ALLOWED_ORIGINS` must list
this site's exact origin.

## SEO

- `index.html`'s title, description, canonical URL, Open Graph and Twitter tags, and JSON-LD
  `Person` data are injected at build time from `src/data/profile.ts` by `vite/seo.ts`, which also
  preloads the heading font. `usePageMeta()` keeps title, description, canonical and Open Graph
  tags in step as you navigate.
- Link previews (Slack, LinkedIn, X, WhatsApp) read only those static tags, because their crawlers
  don't run JavaScript. Every page therefore previews with the site card (`public/og-image.png`);
  per-project previews would need prerendering, which is deferred.
- `public/robots.txt` hides `/admin` and points to the API's sitemap
  (`https://api.aashish-regmi.com.np/sitemap.xml`), which lists every published project.
- After changing your name, role, tagline or location, run `npm run gen:brand` and commit the
  new images.

## Security headers

`npm run build` writes `dist/_headers` (generated by `vite/headers.ts`; never hand-write
`public/_headers`). Cloudflare applies it to every response:

- **Content-Security-Policy**: only this site, the API (`VITE_API_URL`: data, images, the résumé
  PDF frame) and Turnstile. The inline theme script is allowed by its
  SHA-256 hash, computed from the built `index.html`, so editing it can't silently break the CSP.
  No `unsafe-inline` or `unsafe-eval`. A résumé hosted anywhere other than the API's media route
  is linked rather than embedded, because only the API may be framed.
- `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`,
  `Cross-Origin-Opener-Policy` and `Strict-Transport-Security` on every page;
  `X-Robots-Tag: noindex` for `/admin`.
- No long-lived `Cache-Control` for `/assets/*`, although the names are hashed: the
  single-page-app fallback answers a missing file (an old chunk after a deploy) with `index.html`
  and 200, which an `immutable` rule would cache as that script for a year and break a rollback.
  Workers' default (revalidation with ETags) is kept.

Cloudflare zone settings that interact with the CSP:

- **Rocket Loader must stay off.** It rewrites script tags and runs inline code itself, which the
  hash-based CSP blocks (the theme script would stop working).
- **Web Analytics is off.** If you turn it on, add `https://static.cloudflareinsights.com` to
  `script-src` and `https://cloudflareinsights.com` to `connect-src` in `vite/headers.ts`, or its
  beacon is blocked.
- Email address obfuscation is fine: its decoder is served from this origin (`/cdn-cgi/…`).

The Playwright smoke tests serve the build with these headers (`scripts/serve-dist.mjs`) and fail
on any CSP violation, so a policy that breaks a page can't reach `main`.

## Tests and CI

- `npm run check`: typecheck, lint, Vitest (jsdom). Tests mock `fetch`.
- `npm run e2e`: Playwright against two builds served like production, `dist-e2e/site` (as
  deployed) and `dist-e2e/pitch` (`VITE_PITCH_ENABLED=true`, because the flag is read at build
  time). Every API request is answered from fixtures in `e2e/fixtures.ts` and every other request
  is aborted, so the tests never reach the real API. Locally they use the installed Google Chrome
  (`PLAYWRIGHT_CHANNEL` overrides it); CI installs Playwright's Chromium.
- GitHub Actions (`.github/workflows/ci.yml`) runs check, a production build (and checks the
  generated headers) and the browser smoke tests on every pull request and on `main`.
  Dependabot (`.github/dependabot.yml`) opens weekly grouped updates for npm and the actions.
- In GitHub, protect `main` (Settings → Branches → Add rule): require a pull request and the
  status checks **Typecheck, lint, unit tests**, **Production build** and **Browser smoke tests**.

## Deployment

The site is deployed as Cloudflare Workers static assets (`wrangler.jsonc`), with single-page-app
fallback so deep links like `/work/jarvis` load the app. **Cloudflare Workers Builds deploys
`main` automatically after every merge**; CI only checks, it never deploys. Build variables
(`VITE_API_URL`, and optionally `VITE_TURNSTILE_SITE_KEY`, `VITE_PITCH_ENABLED`) are set in the
Cloudflare dashboard: Workers & Pages → portfolio → Settings → Build → Variables and secrets.

A manual deploy, if ever needed:

```bash
VITE_API_URL=https://api.aashish-regmi.com.np npm run build && npx wrangler deploy
```

## Turning on Pitch Me (frontend side)

The Pitch Me panel ships dark: `isPitchEnabled()` (`src/lib/features.ts`) reads
`VITE_PITCH_ENABLED` at **build** time, and anything other than `true` shows the disabled
"coming soon" panel that never calls `/api/v1/pitch/stream`. Do this only after the backend's
go-live checks pass (`PITCH_ENABLED=true` on the API; the runbook is
`docs/PITCH_GO_LIVE.md` in the backend repo, `regmiaashish/portfolio-be`):

1. Cloudflare dashboard → Workers & Pages → **portfolio** → Settings → Build → Variables and
   secrets: add `VITE_PITCH_ENABLED` = `true`. For Turnstile, add `VITE_TURNSTILE_SITE_KEY` = your
   Turnstile **site** key (public; the secret stays on the API) and deploy it **before**
   `TURNSTILE_SECRET` is set on the API: with the secret set and no site key in the build, the API
   rejects every contact message and pitch for lacking a token.
2. Deployments → **Retry deployment** on the latest `main` build (or merge any PR), because build
   variables only apply to new builds.
3. Open `/pitch` in a private window: the form is enabled, and one run streams a pitch.

**Rollback:** delete `VITE_PITCH_ENABLED` (or set it to `false`) and redeploy, or, faster, set
`PITCH_ENABLED=false` on the API, which makes the endpoint refuse runs immediately.

The CSP already allows Turnstile (`https://challenges.cloudflare.com` for its script and frame), so
no header change is needed when the site key is added.

## Licence

See LICENSE.
