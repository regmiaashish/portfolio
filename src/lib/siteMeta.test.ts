import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { apiOrigin, seoTags } from "../../vite/seo";
import { profile } from "../data/profile";
import { DEFAULT_SITE_URL, normaliseSiteUrl, personJsonLd, scriptJson } from "./siteMeta";

const SITE = "https://aashish-regmi.com.np";
const tag = (tags: ReturnType<typeof seoTags>, match: (t: ReturnType<typeof seoTags>[number]) => boolean) =>
  tags.find(match);

describe("site metadata", () => {
  it("normalises the site URL", () => {
    expect(normaliseSiteUrl(undefined)).toBe(DEFAULT_SITE_URL);
    expect(normaliseSiteUrl("https://example.com///")).toBe("https://example.com");
  });

  it("builds JSON-LD Person only from profile fields", () => {
    expect(personJsonLd(profile, SITE)).toEqual({
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Aashish Regmi",
      jobTitle: "Backend & AI engineer",
      url: `${SITE}/`,
      email: "mailto:regmiaashish660@gmail.com",
      sameAs: profile.socials.map((social) => social.href),
      address: { "@type": "PostalAddress", addressLocality: "Kathmandu", addressCountry: "Nepal" },
    });
  });

  it("escapes < so JSON-LD can never close its <script> tag", () => {
    expect(scriptJson({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});

describe("vite SEO plugin tags", () => {
  const tags = seoTags(profile, SITE);
  const attr = (key: string, value: string) =>
    tag(tags, (t) => t.attrs?.[key] === value)?.attrs?.content;

  it("injects title, description and canonical", () => {
    expect(tag(tags, (t) => t.tag === "title")?.children).toBe("Aashish Regmi, Backend & AI engineer");
    expect(attr("name", "description")).toMatch(/^Aashish Regmi, Backend & AI engineer in Kathmandu/);
    expect(tag(tags, (t) => t.attrs?.rel === "canonical")?.attrs?.href).toBe(`${SITE}/`);
  });

  it("injects Open Graph and Twitter tags with an absolute 1200×630 image", () => {
    expect(attr("property", "og:image")).toBe(`${SITE}/og-image.png`);
    expect(attr("property", "og:image:width")).toBe("1200");
    expect(attr("property", "og:image:height")).toBe("630");
    expect(attr("property", "og:url")).toBe(`${SITE}/`);
    expect(attr("name", "twitter:card")).toBe("summary_large_image");
    expect(attr("name", "twitter:image")).toBe(`${SITE}/og-image.png`);
  });

  it("injects parseable JSON-LD", () => {
    const script = tag(tags, (t) => t.attrs?.type === "application/ld+json");
    expect(JSON.parse(String(script?.children))).toMatchObject({ "@type": "Person", name: "Aashish Regmi" });
  });

  it("never renders undefined or null into a tag", () => {
    expect(JSON.stringify(tags)).not.toMatch(/undefined|null/);
  });
});

describe("static SEO files", () => {
  const publicDir = resolve(__dirname, "../../public");

  it("robots.txt allows the site, hides the admin and points at the API sitemap", () => {
    const robots = readFileSync(resolve(publicDir, "robots.txt"), "utf8");
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).toMatch(/^Disallow: \/admin$/m);
    expect(robots).toMatch(/^Sitemap: https:\/\/api\.aashish-regmi\.com\.np\/sitemap\.xml$/m);
  });

  it("the web manifest lists icons that exist", () => {
    const manifest = JSON.parse(readFileSync(resolve(publicDir, "site.webmanifest"), "utf8"));
    for (const icon of manifest.icons) {
      expect(() => readFileSync(resolve(publicDir, icon.src.slice(1)))).not.toThrow();
    }
    expect(() => readFileSync(resolve(publicDir, "og-image.png"))).not.toThrow();
    expect(() => readFileSync(resolve(publicDir, "apple-touch-icon.png"))).not.toThrow();
  });
});

describe("apiOrigin", () => {
  it("reduces the API URL to an origin for the preconnect hint", () => {
    expect(apiOrigin("https://api.aashish-regmi.com.np/")).toBe("https://api.aashish-regmi.com.np");
    expect(apiOrigin("http://localhost:8001")).toBe("http://localhost:8001");
  });

  it("skips the hint when the URL is missing or invalid", () => {
    expect(apiOrigin(undefined)).toBeNull();
    expect(apiOrigin("not a url")).toBeNull();
  });
});
