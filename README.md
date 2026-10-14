# Aashish Regmi: portfolio frontend

The portfolio site of Aashish Regmi, a backend and AI engineer in Kathmandu. It is a small,
fast, accessible React app. The live features, a visitor Context Engine greeting (Phase 3) and
the Pitch Me multi-agent demo (Phase 4), are served by the separate FastAPI backend and arrive in
later phases; this repo currently ships the app shell, design system and content.

## Stack

- React 18, TypeScript, Vite 5
- react-router 7 (`/work/:slug` case-study pages)
- CSS Modules on top of design tokens in `src/styles/tokens.css`
- Self-hosted fonts: Bricolage Grotesque (headings) and Public Sans (body) via `@fontsource-variable`
- Vitest + Testing Library (jsdom)
- ESLint with typescript-eslint, react-hooks and jsx-a11y

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
| `npm run gen:api` | Regenerate `src/lib/api-types.ts` from the backend's OpenAPI schema |

`gen:api` reads `http://localhost:8001/openapi.json` by default, so the backend must be running
with `ENV=dev` (the schema is hidden in production). To use another source, set `OPENAPI_URL`, for
example `OPENAPI_URL=./openapi.json npm run gen:api`.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | Yes | Base URL of the backend, no trailing slash. `vite build` fails if it is missing. |
| `VITE_TURNSTILE_SITE_KEY` | No | Cloudflare Turnstile site key. When set, the contact form shows the Turnstile check and sends its token; when unset (local development, tests), the form works without it. The backend's `TURNSTILE_SECRET` must be set to the matching secret. |
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

## Deployment

The site is deployed as Cloudflare Workers static assets (`wrangler.jsonc`), with single-page-app
fallback so deep links like `/work/jarvis` load the app:

```bash
npm run build && npx wrangler deploy
```

## Licence

See LICENSE.
