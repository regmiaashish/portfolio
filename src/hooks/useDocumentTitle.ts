import { useEffect } from "react";

import { profile } from "../data/profile";

const SITE_TITLE = `${profile.name}, ${profile.role}`;

/** Sets the tab title; pages pass their own name, the home page passes nothing. */
export function useDocumentTitle(pageTitle?: string): void {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} | ${profile.name}` : SITE_TITLE;
  }, [pageTitle]);
}
