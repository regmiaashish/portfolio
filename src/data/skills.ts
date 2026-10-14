import type { SkillGroup } from "../lib/cmsContracts";

/** Bundled fallback for the skill groups; edited from /admin. */
export const skillGroups: SkillGroup[] = [
  {
    id: "snapshot-skills-backend",
    title: "Backend",
    description: "APIs and data layers that are typed, tested and boring to operate.",
    skills: ["Python", "FastAPI", "Django", "Pydantic", "SQLAlchemy", "PostgreSQL", "MongoDB", "SQL"],
  },
  {
    id: "snapshot-skills-ai",
    title: "AI integration",
    description: "LLMs and voice wired into real products, with cost and abuse controls.",
    skills: ["OpenAI", "Gemini", "Ollama", "LangChain", "ElevenLabs", "Twilio"],
  },
  {
    id: "snapshot-skills-infra",
    title: "Infrastructure",
    description: "Shipping and running it: containers, cloud, payments and auth.",
    skills: ["Docker", "GCP", "NeonDB", "Stripe", "JWT"],
  },
];
