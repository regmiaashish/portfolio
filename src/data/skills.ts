export interface SkillGroup {
  title: string;
  description: string;
  skills: string[];
}

export const skillGroups: SkillGroup[] = [
  {
    title: "Backend",
    description: "APIs and data layers that are typed, tested and boring to operate.",
    skills: ["Python", "FastAPI", "Django", "Pydantic", "SQLAlchemy", "PostgreSQL", "MongoDB", "SQL"],
  },
  {
    title: "AI integration",
    description: "LLMs and voice wired into real products, with cost and abuse controls.",
    skills: ["OpenAI", "Gemini", "Ollama", "LangChain", "ElevenLabs", "Twilio"],
  },
  {
    title: "Infrastructure",
    description: "Shipping and running it: containers, cloud, payments and auth.",
    skills: ["Docker", "GCP", "NeonDB", "Stripe", "JWT"],
  },
];
