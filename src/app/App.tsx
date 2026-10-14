import { BrowserRouter } from "react-router";

import { AppRoutes } from "./AppRoutes";
import { ContentProvider } from "./ContentProvider";
import { ThemeProvider } from "./ThemeProvider";

export function App() {
  return (
    <ThemeProvider>
      <ContentProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ContentProvider>
    </ThemeProvider>
  );
}
