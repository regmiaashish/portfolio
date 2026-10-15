/**
 * Site-wide metadata, shared by the build (vite/seo.ts injects it into index.html) and the app
 * (usePageMeta). Pure: no `import.meta.env`, no DOM, so it runs in Node and the browser.
 */
import type { Profile } from "./cmsContracts.ts";

export const DEFAULT_SITE_URL = "https://aashish-regmi.com.np";
export const OG_IMAGE = { path: "/og-image.png", width: 1200, height: 630 } as const;

export function normaliseSiteUrl(url: string | undefined): string {
  return (url || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

export function siteTitle(profile: Pick<Profile, "name" | "role">): string {
  return `${profile.name}, ${profile.role}`;
}

export function pageTitle(profile: Pick<Profile, "name" | "role">, page?: string): string {
  return page ? `${page} | ${profile.name}` : siteTitle(profile);
}

/** Built only from profile fields, so it never claims anything the profile doesn't. */
export function siteDescription(profile: Pick<Profile, "name" | "role" | "location" | "tagline">): string {
  return `${profile.name}, ${profile.role} in ${profile.location}. ${profile.tagline}`;
}

export function ogImageAlt(profile: Pick<Profile, "name" | "role" | "tagline">): string {
  return `${siteTitle(profile)}: ${profile.tagline}`;
}

/** schema.org Person for search engines. */
export function personJsonLd(profile: Profile, siteUrl: string): Record<string, unknown> {
  const [locality, ...rest] = profile.location.split(",").map((part) => part.trim());
  const country = rest.join(", ");
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.role,
    url: `${siteUrl}/`,
    email: `mailto:${profile.email}`,
    sameAs: profile.socials.map((social) => social.href),
    address: {
      "@type": "PostalAddress",
      addressLocality: locality,
      ...(country ? { addressCountry: country } : {}),
    },
  };
}

/** JSON for a <script> element: "<" is escaped so content can never close the tag. */
export function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
