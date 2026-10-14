import type { Project } from "../lib/cmsContracts";

/** Bundled fallback for the projects; the live site edits them from /admin. */
export const projects: Project[] = [
  {
    id: "snapshot-fagoon-upgrade",
    slug: "fagoon-upgrade",
    name: "Fagoon Upgrade",
    category: "Open-source AI platform",
    summary:
      "A self-hosted AI platform: drag-and-drop workflow building, WhatsApp agent deployment " +
      "and local LLM integration.",
    stack: ["FastAPI", "Python", "Docker", "OpenAI", "Gemini", "Ollama", "Twilio"],
    repo_url: null,
    demo_url: null,
    // Logo only for now; replace with a real product screenshot from /admin.
    image: { url: "/images/fagoon-upgrade.png", alt: "Fagoon Upgrade logo", width: 575, height: 373 },
    case_study: null,
  },
  {
    id: "snapshot-gains-garage",
    slug: "gains-garage",
    name: "Gains Garage backend",
    category: "SaaS with generative AI",
    summary: "Production APIs for the Gains Garage SaaS platform, including Stripe billing.",
    stack: ["FastAPI", "PostgreSQL", "NeonDB", "GCP", "Stripe"],
    repo_url: null,
    demo_url: null,
    image: null,
    case_study: null,
  },
  {
    id: "snapshot-alliance",
    slug: "alliance",
    name: "Alliance backend",
    category: "AI calling platform",
    summary: "An automated AI calling pipeline built on Twilio and ElevenLabs voice.",
    stack: ["FastAPI", "Python", "MongoDB", "Twilio", "ElevenLabs", "Stripe"],
    repo_url: null,
    demo_url: null,
    image: null,
    case_study: null,
  },
  {
    id: "snapshot-jarvis",
    slug: "jarvis",
    name: "Jarvis voice assistant",
    category: "Desktop app",
    summary: "A desktop voice assistant with speech recognition and text to speech.",
    stack: ["Python", "SpeechRecognition", "pyttsx3"],
    repo_url: "https://github.com/regmiaashish/jarvis",
    demo_url: null,
    image: null,
    case_study: null,
  },
  {
    id: "snapshot-cricket-management-system",
    slug: "cricket-management-system",
    name: "Cricket management system",
    category: "Web application",
    summary: "Team, player and match management with JWT authentication.",
    stack: ["Python", "Django", "MySQL", "JWT"],
    repo_url: "https://github.com/regmiaashish/cricket-management-system",
    demo_url: null,
    image: null,
    case_study: null,
  },
];
