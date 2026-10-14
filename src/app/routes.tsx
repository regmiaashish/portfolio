import { lazy, Suspense } from "react";
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

// The admin is a separate chunk: visitors never download it.
const AdminApp = lazy(() => import("../admin/AdminApp"));

export const routes: RouteObject[] = [
  {
    path: "admin/*",
    element: (
      <Suspense
        fallback={
          <p role="status" style={{ padding: "var(--space-6)" }}>
            Loading the admin…
          </p>
        }
      >
        <AdminApp />
      </Suspense>
    ),
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
