import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import { AppRoutes } from "../app/AppRoutes";
import { ThemeProvider } from "../app/ThemeProvider";

/** Renders the real app (routes, layout, theme) at the given URL. */
export function renderApp(url = "/") {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[url]}>
        <AppRoutes />
      </MemoryRouter>
    </ThemeProvider>,
  );
}
