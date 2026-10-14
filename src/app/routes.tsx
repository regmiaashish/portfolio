import type { RouteObject } from "react-router";

import { CaseStudyPage } from "../pages/CaseStudyPage";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { AppLayout } from "./AppLayout";

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "work/:slug", element: <CaseStudyPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
