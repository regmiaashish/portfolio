export interface Project {
  slug: string;
  name: string;
  category: string;
  summary: string;
  stack: string[];
  /** Public source code, if the project is open. Company work has none. */
  repoUrl?: string;
  demoUrl?: string;
  image?: { src: string; alt: string; width: number; height: number };
  /** Case-study sections are written in Phase 5; until then the page says so. */
  caseStudy?: { problem: string; role: string; decisions: string[]; result: string };
}

export const projects: Project[] = [
  {
    slug: "fagoon-upgrade",
    name: "Fagoon Upgrade",
    category: "Open-source AI platform",
    summary:
      "A self-hosted AI platform: drag-and-drop workflow building, WhatsApp agent deployment " +
      "and local LLM integration.",
    stack: ["FastAPI", "Python", "Docker", "OpenAI", "Gemini", "Ollama", "Twilio"],
    // Logo only for now; replace with a real product screenshot in Phase 5.
    image: { src: "/images/fagoon-upgrade.png", alt: "Fagoon Upgrade logo", width: 575, height: 373 },
  },
  {
    slug: "gains-garage",
    name: "Gains Garage backend",
    category: "SaaS with generative AI",
    summary: "Production APIs for the Gains Garage SaaS platform, including Stripe billing.",
    stack: ["FastAPI", "PostgreSQL", "NeonDB", "GCP", "Stripe"],
  },
  {
    slug: "alliance",
    name: "Alliance backend",
    category: "AI calling platform",
    summary: "An automated AI calling pipeline built on Twilio and ElevenLabs voice.",
    stack: ["FastAPI", "Python", "MongoDB", "Twilio", "ElevenLabs", "Stripe"],
  },
  {
    slug: "jarvis",
    name: "Jarvis voice assistant",
    category: "Desktop app",
    summary: "A desktop voice assistant with speech recognition and text to speech.",
    stack: ["Python", "SpeechRecognition", "pyttsx3"],
    repoUrl: "https://github.com/regmiaashish/jarvis",
  },
  {
    slug: "cricket-management-system",
    name: "Cricket management system",
    category: "Web application",
    summary: "Team, player and match management with JWT authentication.",
    stack: ["Python", "Django", "MySQL", "JWT"],
    repoUrl: "https://github.com/regmiaashish/cricket-management-system",
  },
];

export function findProject(slug: string | undefined): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
