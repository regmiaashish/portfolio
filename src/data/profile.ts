import type { Profile } from "../lib/cmsContracts";

/** Bundled fallback for the profile; the live site edits it from /admin. */
export const profile: Profile = {
  name: "Aashish Regmi",
  role: "Backend & AI engineer",
  location: "Kathmandu, Nepal",
  tagline: "I build backends that stay up and AI that ships.",
  summary:
    "Junior backend developer at Fagoon AI, building RESTful APIs and backend infrastructure. " +
    "I've shipped production systems across AI platforms, SaaS and real estate with Python, " +
    "FastAPI, Django, GCP, Docker, PostgreSQL, MongoDB, Twilio and ElevenLabs.",
  email: "regmiaashish660@gmail.com",
  phone: { display: "+977 9840046034", href: "tel:+9779840046034" },
  socials: [
    { kind: "github", label: "GitHub", href: "https://github.com/regmiaashish" },
    {
      kind: "linkedin",
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/aashish-regmi-228868309",
    },
    { kind: "instagram", label: "Instagram", href: "https://www.instagram.com/regs.exe" },
  ],
  // Uploaded or linked from /admin; nothing bundled.
  resume_url: null,
};
