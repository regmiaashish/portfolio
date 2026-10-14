/**
 * Injects SEO tags into index.html from the bundled profile, so they never drift from the
 * content: title, description, canonical, Open Graph, Twitter card and JSON-LD Person. In
 * production builds it also preloads the two Latin font files the first screen uses (measured:
 * first paint on simulated mobile 1.5 s → 1.2 s).
 *
 * Social crawlers don't run JavaScript, so these static tags are what link previews show for
 * every URL; the app updates them per page for browsers and search engines (usePageMeta).
 */
import type { HtmlTagDescriptor, Plugin } from "vite";

import { profile } from "../src/data/profile";
import type { Profile } from "../src/lib/cmsContracts";
import {
  OG_IMAGE,
  ogImageAlt,
  personJsonLd,
  scriptJson,
  siteDescription,
  siteTitle,
} from "../src/lib/siteMeta";

// Latin subsets only (not latin-ext/vietnamese): the first screen is English.
const FIRST_SCREEN_FONTS = [
  /bricolage-grotesque-latin-wght-normal-[\w-]+\.woff2$/,
  /public-sans-latin-wght-normal-[\w-]+\.woff2$/,
];

const meta = (attrs: Record<string, string>): HtmlTagDescriptor => ({
  tag: "meta",
  attrs,
  injectTo: "head",
});

/** Pure: the tags for a profile and site URL (tested directly). */
export function seoTags(content: Profile, siteUrl: string): HtmlTagDescriptor[] {
  const title = siteTitle(content);
  const description = siteDescription(content);
  const image = `${siteUrl}${OG_IMAGE.path}`;
  return [
    { tag: "title", children: title, injectTo: "head" },
    meta({ name: "description", content: description }),
    { tag: "link", attrs: { rel: "canonical", href: `${siteUrl}/` }, injectTo: "head" },
    meta({ property: "og:type", content: "website" }),
    meta({ property: "og:site_name", content: content.name }),
    meta({ property: "og:title", content: title }),
    meta({ property: "og:description", content: description }),
    meta({ property: "og:url", content: `${siteUrl}/` }),
    meta({ property: "og:image", content: image }),
    meta({ property: "og:image:width", content: String(OG_IMAGE.width) }),
    meta({ property: "og:image:height", content: String(OG_IMAGE.height) }),
    meta({ property: "og:image:alt", content: ogImageAlt(content) }),
    meta({ name: "twitter:card", content: "summary_large_image" }),
    meta({ name: "twitter:title", content: title }),
    meta({ name: "twitter:description", content: description }),
    meta({ name: "twitter:image", content: image }),
    {
      tag: "script",
      attrs: { type: "application/ld+json" },
      children: scriptJson(personJsonLd(content, siteUrl)),
      injectTo: "head",
    },
  ];
}

export function seoPlugin(siteUrl: string): Plugin {
  return {
    name: "portfolio-seo",
    transformIndexHtml: {
      order: "post",
      handler(_html, context) {
        const tags = seoTags(profile, siteUrl);
        const files = Object.keys(context.bundle ?? {});
        const preloads = FIRST_SCREEN_FONTS.flatMap((pattern) => files.filter((file) => pattern.test(file)));
        return [
          ...preloads.map(
            (file): HtmlTagDescriptor => ({
              tag: "link",
              attrs: { rel: "preload", href: `/${file}`, as: "font", type: "font/woff2", crossorigin: "" },
              injectTo: "head-prepend",
            }),
          ),
          ...tags,
        ];
      },
    },
  };
}
