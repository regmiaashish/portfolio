import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import { AppRoutes } from "../app/AppRoutes";
import { ContentProvider } from "../app/ContentProvider";
import { ThemeProvider } from "../app/ThemeProvider";

/** Renders the real app (routes, layout, theme) at the given URL. */
export function renderApp(url = "/") {
  return render(
    <ThemeProvider>
      <ContentProvider>
        <MemoryRouter initialEntries={[url]}>
          <AppRoutes />
        </MemoryRouter>
      </ContentProvider>
    </ThemeProvider>,
  );
}
