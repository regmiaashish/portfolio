# Design system: "live systems console"

The site is a running system you can look inside. A backend and AI engineer's portfolio should
feel like a well-instrumented service: calm, precise, observably alive. Everything here is
binding for new pages and components.

## Principles

1. **Real or nothing.** Every number on screen is measured live (API latency, clock) or derived
   from content (project count, career). No invented uptime, p95, "years of experience", client
   counts or claims about how Aashish works. If data is missing, omit it.
2. **One signal colour.** Marigold means *live / primary*. Use it for the live lamp, the cursor in
   the wordmark and **one** primary button per view. Signal blue means *system / running / link*.
3. **Telemetry is mono, prose is not.** Monospace only for labels, readouts, paths, logs and
   status. Headlines and body copy stay in the display/body faces.
4. **Calm motion with a purpose.** Motion explains state (page change, content arriving, agent
   running). Never decorative loops on content, never scroll hijacking, never a custom cursor.
5. **Both themes are first-class.** Dark = night operations console. Light = engineering
   blueprint on paper. Same structure, different mood; system preference + manual toggle.

## Tokens (`src/styles/tokens.css`)

Defined in three blocks (light, system-dark, explicit-dark) that must stay in sync;
`src/styles/contrast.test.ts` enforces WCAG AA for every text pair (4.5:1) and UI pair (3:1).

| Role | Tokens |
|---|---|
| Page | `--color-bg`, `--color-surface`, `--color-surface-sunken` |
| Text | `--color-text`, `--color-text-muted`, `--color-telemetry` (mono labels) |
| Console surfaces | `--color-panel`, `--color-panel-header`, `--color-panel-border` |
| Lines | `--color-border` (decorative), `--color-border-strong` (controls, 3:1) |
| Signals | `--color-accent` (marigold fill), `--color-accent-contrast` (text on it), `--color-live`, `--color-signal`, `--color-link`, `--color-ok(-text)`, `--color-err(-text)`, `--color-focus` |
| Atmosphere (non-text, translucent) | `--color-grid`, `--color-glow` (marigold haze), `--color-glow-signal` |
| Elevation | `--shadow-panel` (resting), `--shadow-lift` (hover/focus) |
| Motion | `--duration-fast` 120ms, `--duration-base` 200ms, `--duration-slow` 420ms, `--duration-reveal` 640ms; `--ease-out`, `--ease-in-out`, `--ease-emphasis` |
| Layout | `--container-max` 72rem, `--gutter`, `--header-height` 4rem, `--status-bar-height` 2.25rem, `--grid-size` 32px |

Never hard-code a colour. New text/UI colour → add the token to all three blocks and a pair to
the contrast test. Marigold is never small text on light surfaces (2:1); use it as a fill.

## Type

- **Display:** Bricolage Grotesque (h1–h4, wordmark, monograms). Tight tracking on large sizes.
- **Body:** Public Sans, 17px base, line-height 1.6, measure ≤ 68ch.
- **Mono:** system `ui-monospace` via the `.mono` utility (0.8125rem, tabular numbers). Lowercase
  labels (`~/work`, `agents.pipeline`, `based in`). Telemetry only.
- Scale 14 / 17 / 21 / 28 / 40 / 64; hero headline up to 72px via clamp.

## Spacing, radius, elevation

4px base (`--space-1` … `--space-9`). Radius with intent: 4px inputs, 8px panels/cards, 999px
pills. Panels rest on `--shadow-panel`; interactive cards lift to `--shadow-lift` and move up 3px
on `:hover` **and** `:focus-within`.

## Atmosphere

`AppLayout` renders one fixed `.console-backdrop`: a fine grid with a radial fade mask plus a
marigold haze top-left and a signal haze top-right. Pure CSS, never animated, `z-index: -1`.
Don't add canvas/WebGL or per-section backgrounds that compete with it.

## Motion

| What | How |
|---|---|
| Page change | View Transitions API via `TransitionLink` / `TransitionNavLink` (`components/motion`). Root cross-fades with a 6–10px slide (`--duration-slow`, `--ease-emphasis`); the header has `view-transition-name: site-header` and stays still. Falls back to plain navigation when unsupported or reduced motion. Modified clicks are never intercepted. |
| Scroll reveal | `<Reveal>` (IntersectionObserver): fade + 16px lift once, stagger siblings with `delayMs` (~70ms). Never on above-the-fold/LCP content. Content is visible immediately without IntersectionObserver or with reduced motion. |
| Live state | `StatusLight` lamps: `live` glows + slow breathing ring (2.4s), `running` faster ring. |
| Arrival of data | Greeting readout resolves with fade/slide/blur-in (staggered 90ms). |
| Hover/focus | Card lift, arrow nudge 4px. |

`prefers-reduced-motion: reduce` disables all of it (base.css): animations/transitions collapse,
reveals show immediately, view transitions are skipped.

## Console primitives (`src/components/console`)

| Component | Use for | Notes |
|---|---|---|
| `Panel` | A window onto part of the system: header bar (mono `title`, optional `status`, `actions`) over a body | Title is decorative; put a real heading inside and set `aria-labelledby` when it's a landmark (`as="aside"`/`"section"`). `flush` for edge-to-edge bodies. |
| `StatusLight` | State lamps (`idle`, `running`, `done`, `error`, `live`, `online`, `offline`) | Always pass a `label`; `showLabel={false}` keeps it for screen readers only. |
| `ReadoutList` + `Readout` | Label/value pairs of real data | Renders `<dl>`/`<dt>`/`<dd>`; optional `unit`. |
| `Sparkline` | Tiny trends (latency) | `role="img"` with a summarising `label`; dashed placeholder under 2 points. |

Layout/motion helpers: `PageHeader` (mono `$ cd ~/path`, the page's only h1, intro), `Section`
(`label`, `action`, `plain`), `Reveal`, `TransitionLink`. Existing UI primitives (`Button`,
`Field`, `Chip`, `Icon`, `StatusDot`) remain the base layer.

## Page anatomy

```
Header (sticky, wordmark ~/name▌, nav Work·Pitch·About·Contact, theme)
StatusBar (real telemetry: api lamp + ms + sparkline · kathmandu time · N projects live)
<main>
  Home:  Hero (greeting readout · h1 · summary · CTAs | AgentsTeaser panel)
         Selected work (3 cards) · About teaser (now + whoami readouts) · Contact band
  Inner: PageHeader (path · h1 · intro) → sections (h2, mono label ~/page/section)
Footer (brand · pages · elsewhere · mono base line)
```

Routes: `/`, `/work`, `/work/:slug`, `/pitch`, `/about`, `/contact`, 404, `/admin` (lazy). Old
anchors (`/#work`, `/#pitch`, `/#contact`, `/#about`, `/#career`, `/#stack`) redirect.

**CTA rule:** one marigold primary per view. In the hero it's "See my work" while Pitch Me ships
dark and "Pitch me" once `VITE_PITCH_ENABLED=true`; further down the page (a new view) the
contact band may use primary again.

## Accessibility (non-negotiable)

- One h1 per page; headings never skip levels; landmarks: banner, main, contentinfo, Main nav.
- `aria-current="page"` on the active nav item (handled by `TransitionNavLink`).
- 44px minimum targets; visible `:focus-visible` everywhere (cards outline via `::after`).
- Colour is never the only cue (lamps carry text). Icon-only controls have `aria-label`.
- The status bar is **not** a live region; the greeting is `aria-live="polite"` once.
- External links: `target="_blank" rel="noopener noreferrer"` + visually hidden "(opens in a new tab)".
- Decorative layers (backdrop, card monograms, separators) are `aria-hidden`.

## Do / don't

| Do | Don't |
|---|---|
| Show measured or content-derived data | Invent metrics, testimonials or promises |
| Use mono for telemetry labels | Set paragraphs or headings in mono |
| Use marigold once per view as the live/primary signal | Use marigold for small text on light surfaces |
| Use `Panel` for system-like modules | Wrap every block in a panel (cards and prose can breathe) |
| Keep motion tied to state changes | Loop animations on content, hijack scroll, add a custom cursor |
| Number steps only when they are a sequence (agent pipeline) | Number-label sections (01/02/03) or put uppercase eyebrows everywhere |
