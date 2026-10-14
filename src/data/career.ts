export interface CareerEntry {
  role: string;
  company: string;
  period: string;
  summary: string;
}

/** Most recent first. */
export const career: CareerEntry[] = [
  {
    role: "Junior backend developer",
    company: "Fagoon AI",
    period: "Now",
    summary:
      "Building and maintaining REST APIs and backend infrastructure across Fagoon AI's products. " +
      "Core contributor to Fagoon Upgrade, an open-source, self-hosted AI platform.",
  },
  {
    role: "Backend developer intern",
    company: "Fagoon AI",
    period: "2026",
    summary:
      "Built production APIs for the Gains Garage SaaS platform and Alliance's AI calling pipeline, " +
      "integrating ElevenLabs, Twilio and Stripe.",
  },
  {
    role: "Python / Django intern",
    company: "Treeleaf Technologies",
    period: "2024",
    summary:
      "Built REST APIs and candlestick charts for Bluerock, a stock trading platform, and worked " +
      "on a FastAPI backend for PDF plagiarism and grammar analysis.",
  },
];
