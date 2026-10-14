import { createContext, useContext } from "react";

import { contentSnapshot } from "../data/snapshot";
import type { Project, SiteContent } from "../lib/cmsContracts";

export interface ContentContextValue {
  content: SiteContent;
  /** "snapshot" (bundled) or "cache" (this visitor's last API copy) until the API answers. */
  source: "snapshot" | "cache" | "api";
  /** True once the API has answered or failed; false while the first request is in flight. */
  settled: boolean;
}

export const ContentContext = createContext<ContentContextValue>({
  content: contentSnapshot,
  source: "snapshot",
  settled: true,
});

/** Everything the public site shows. Never empty: falls back to the bundled snapshot. */
export function useContent(): ContentContextValue {
  return useContext(ContentContext);
}

export function findProject(content: SiteContent, slug: string | undefined): Project | undefined {
  return content.projects.find((project) => project.slug === slug);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Minimal shape check so a broken or old API response can never blank the site. */
export function isSiteContent(value: unknown): value is SiteContent {
  if (!isRecord(value) || !isRecord(value.profile)) return false;
  const profile = value.profile;
  return (
    typeof profile.name === "string" &&
    typeof profile.tagline === "string" &&
    typeof profile.email === "string" &&
    Array.isArray(profile.socials) &&
    Array.isArray(value.projects) &&
    Array.isArray(value.career) &&
    Array.isArray(value.skills)
  );
}
