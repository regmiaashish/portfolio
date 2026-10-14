import { useEffect } from "react";
import { useLocation } from "react-router";

import { SITE_URL } from "../lib/site";
import { pageTitle, siteDescription } from "../lib/siteMeta";
import { useContent } from "./useContent";

export interface PageMeta {
  /** Page name; omitted on the home page. */
  title?: string;
  /** Defaults to the site description built from the profile. */
  description?: string;
  /** e.g. "noindex" for the 404 page, "noindex, nofollow" for the admin. */
  robots?: string;
}

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function setCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
}

/**
 * Keeps the document head in step with client-side navigation: title, description, canonical
 * and the Open Graph basics. (Link previews on social sites read only the static tags in
 * index.html, because their crawlers don't run JavaScript.)
 */
export function usePageMeta({ title, description, robots }: PageMeta = {}): void {
  const { profile } = useContent().content;
  const { pathname } = useLocation();

  const fullTitle = pageTitle(profile, title);
  const fullDescription = description ?? siteDescription(profile);
  const url = `${SITE_URL}${pathname}`;

  useEffect(() => {
    document.title = fullTitle;
    setMeta('meta[name="description"]', "name", "description", fullDescription);
    setMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    setMeta('meta[property="og:description"]', "property", "og:description", fullDescription);
    setMeta('meta[property="og:url"]', "property", "og:url", url);
    setCanonical(url);
  }, [fullTitle, fullDescription, url]);

  useEffect(() => {
    if (!robots) return;
    const element = document.createElement("meta");
    element.name = "robots";
    element.content = robots;
    element.dataset.pageMeta = "";
    document.head.appendChild(element);
    return () => element.remove();
  }, [robots]);
}
