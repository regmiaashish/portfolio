import type { RouteObject } from "react-router";

import { AboutPage } from "../pages/AboutPage";
import { CaseStudyPage } from "../pages/CaseStudyPage";
import { ContactPage } from "../pages/ContactPage";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { PitchPage } from "../pages/PitchPage";
import { ResumePage } from "../pages/ResumePage";
import { WorkPage } from "../pages/WorkPage";
import { AppLayout } from "./AppLayout";
import { LazyAdmin } from "./LazyAdmin";

export const routes: RouteObject[] = [
  {
    path: "admin/*",
    element: <LazyAdmin />,
  },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "work", element: <WorkPage /> },
      { path: "work/:slug", element: <CaseStudyPage /> },
      { path: "pitch", element: <PitchPage /> },
      { path: "about", element: <AboutPage /> },
      { path: "resume", element: <ResumePage /> },
      { path: "contact", element: <ContactPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
