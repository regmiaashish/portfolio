import { render } from "@testing-library/react";
import { type Location, MemoryRouter, useLocation } from "react-router";

import { AppRoutes } from "../app/AppRoutes";
import { ThemeProvider } from "../app/ThemeProvider";
import { contentSnapshot } from "../data/snapshot";
import { ContentContext } from "../hooks/useContent";
import type { SiteContent } from "../lib/cmsContracts";

/**
 * Renders the real routes with fixed content (no fetching) and exposes the current location,
 * so tests can assert URL state such as ?stack= filters.
 */
export function renderWork(url: string, content: SiteContent = contentSnapshot) {
  const current: { location: Location | null } = { location: null };
  function LocationProbe() {
    current.location = useLocation();
    return null;
  }
  const result = render(
    <ThemeProvider>
      <ContentContext.Provider value={{ content, source: "api", settled: true }}>
        <MemoryRouter initialEntries={[url]}>
          <AppRoutes />
          <LocationProbe />
        </MemoryRouter>
      </ContentContext.Provider>
    </ThemeProvider>,
  );
  return { ...result, location: () => current.location };
}
