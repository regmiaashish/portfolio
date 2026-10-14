import { useEffect } from "react";

import { useContent } from "./useContent";

/** Sets the tab title; pages pass their own name, the home page passes nothing. */
export function useDocumentTitle(pageTitle?: string): void {
  const { name, role } = useContent().content.profile;
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} | ${name}` : `${name}, ${role}`;
  }, [pageTitle, name, role]);
}
