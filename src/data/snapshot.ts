import type { SiteContent } from "../lib/cmsContracts";
import { career } from "./career";
import { profile } from "./profile";
import { projects } from "./projects";
import { skillGroups } from "./skills";

/**
 * The content bundled into the build. The public site renders this immediately and swaps
 * in `GET /api/v1/content` when it arrives, so it never renders empty, even if the API is down.
 */
export const contentSnapshot: SiteContent = {
  profile,
  projects,
  career,
  skills: skillGroups,
  updated_at: "1970-01-01T00:00:00Z",
};
