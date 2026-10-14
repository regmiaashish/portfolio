import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router";

import { CaseStudyPage } from "../pages/CaseStudyPage";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
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
      { path: "work/:slug", element: <CaseStudyPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
