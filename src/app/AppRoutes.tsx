import { useRoutes } from "react-router";

import { routes } from "./routes";

/** The route tree, shared by the browser router (App) and the memory router (tests). */
export function AppRoutes() {
  return useRoutes(routes);
}
