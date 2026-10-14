import type { CareerEntry } from "../lib/cmsContracts";

/** Bundled fallback for the career timeline, most recent first; edited from /admin. */
export const career: CareerEntry[] = [
  {
    id: "snapshot-career-fagoon-junior",
    role: "Junior backend developer",
    company: "Fagoon AI",
    period: "Now",
    summary:
      "Building and maintaining REST APIs and backend infrastructure across Fagoon AI's products. " +
      "Core contributor to Fagoon Upgrade, an open-source, self-hosted AI platform.",
  },
  {
    id: "snapshot-career-fagoon-intern",
    role: "Backend developer intern",
    company: "Fagoon AI",
    period: "2026",
    summary:
      "Built production APIs for the Gains Garage SaaS platform and Alliance's AI calling pipeline, " +
      "integrating ElevenLabs, Twilio and Stripe.",
  },
  {
    id: "snapshot-career-treeleaf",
    role: "Python / Django intern",
    company: "Treeleaf Technologies",
    period: "2024",
    summary:
      "Built REST APIs and candlestick charts for Bluerock, a stock trading platform, and worked " +
      "on a FastAPI backend for PDF plagiarism and grammar analysis.",
  },
];
