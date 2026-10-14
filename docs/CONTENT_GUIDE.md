# Content guide

What to write and upload in `/admin` so the portfolio does its job: show, in 30 seconds, that
your work is real and running. Everything here is edited in the dashboard; no code changes or
redeploys are needed. Changes appear on the public site within about a minute.

## What's still a placeholder today

| Item | Today | What it needs |
|---|---|---|
| Case studies | None of the five projects has one, so each project page says "being written" | A case study for your 2–3 strongest projects (below) |
| Project screenshots | Only Fagoon Upgrade has an image, and it's the logo, not the product | A real screenshot for each project |
| Repository / demo links | Fagoon Upgrade, Gains Garage and Alliance have none (company work) | Add public links where they exist; otherwise leave empty (the button is hidden) |
| Résumé | Not set, so the "Résumé (PDF)" links are hidden | Upload your PDF in Profile → Résumé |
| Measurable results | None anywhere | One honest number per flagship project (below) |

## Projects (Admin → Projects)

For every project:

- **Name** and **category**: plain, e.g. "Alliance backend" / "AI calling platform".
- **Summary**: one sentence, under 300 characters, saying what it does for whom.
- **Stack**: the 4–7 technologies that mattered, not every library.
- **Links**: source code and live demo, only if they're public. Never link to a private repo or
  your GitHub profile as a stand-in.
- **Published**: untick to hide a project without deleting it.
- **Order**: put the strongest work first (Move up / Move down).

### Case study (optional section in the project form)

Write one for each flagship project. Keep each field short; recruiters skim.

1. **The problem**: who had it and why it mattered (2–3 sentences).
2. **My role**: what you personally owned, not what the team did.
3. **Key decisions**: 3 decisions, one line each, with the trade-off. For example,
   "Streamed tokens over SSE instead of polling, so the UI shows progress in under a second."
4. **Result**: one measurable outcome, if you have it: latency, uptime, cost, users, time saved.
   Use a real number you can defend in an interview. If you don't have one, describe the
   concrete outcome ("in production since March, handling every inbound call") rather than
   inventing a metric.

## Screenshots

- **Size**: at least 1600 px wide, landscape (16:10 or 16:9 works best in the cards). Larger is
  fine: the admin resizes to 1600 px and converts to WebP before uploading, and shows what it did.
- **Content**: the product doing its job (a dashboard with realistic data, a workflow, a terminal
  showing the API), not a logo or a blank login page. Crop out browser chrome, bookmarks, other
  tabs, and anything private (real customer names, emails, API keys, internal URLs).
- **Alt text** (required): describe what the screenshot shows, in one sentence, e.g. "Fagoon
  Upgrade's workflow builder with a WhatsApp agent connected to a local LLM". Not "screenshot".

## Résumé (Admin → Profile → Résumé)

Upload a PDF (up to 5 MB) or paste a link to one. It appears as "Résumé (PDF)" in the hero and in
Contact. Upload a new file to replace it, or Remove to hide the links. Check that it opens
publicly in a private browser window.

## Profile copy (Admin → Profile)

- **Tagline**: the large heading, under 160 characters. One idea, no buzzwords.
- **Summary**: 2–3 sentences: what you do now, what you've shipped, the stack you're strongest in.
- **Social links**: only profiles you keep current.
- If you change your name, role, tagline or location, ask for `npm run gen:brand` to be run, so
  the link-preview image and icons match. (Those are generated at build time.)

## Career and skills

- **Career**: newest first, one entry per role. The summary is the outcome, not the duties:
  "Built the production APIs for X" beats "Responsible for backend development".
- **Skills**: three groups is plenty. Each group's description is one sentence on how you use
  them, not a rating.

## After editing

- Look at the public site on your phone.
- Projects you publish are added to the sitemap automatically.
- Optional: in Google Search Console, add the site and submit
  `https://api.aashish-regmi.com.np/sitemap.xml` (it's also listed in `robots.txt`).
