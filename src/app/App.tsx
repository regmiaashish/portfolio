import { BrowserRouter } from "react-router";

import { AppRoutes } from "./AppRoutes";
import { ThemeProvider } from "./ThemeProvider";

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}
