import type { CSSProperties } from "react";

/** A valid CSS ident from a slug ("fagoon-upgrade" → "fagoon-upgrade"). */
function ident(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

/**
 * Shared-element names for the View Transitions API: a project's title and cover/image keep
 * the same name on its card and its case study, so the browser morphs one into the other.
 * Names must be unique on a page, which slugs are.
 */
export function projectTitleTransition(slug: string): CSSProperties {
  return { viewTransitionName: `project-title-${ident(slug)}` } as CSSProperties;
}

export function projectMediaTransition(slug: string): CSSProperties {
  return { viewTransitionName: `project-media-${ident(slug)}` } as CSSProperties;
}
