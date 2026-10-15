import { lazy, Suspense } from "react";

// The admin is a separate chunk: visitors never download it.
const AdminApp = lazy(() => import("../admin/AdminApp"));

/** `/admin/*`, loaded on first visit. */
export function LazyAdmin() {
  return (
    <Suspense
      fallback={
        <p role="status" style={{ padding: "var(--space-6)" }}>
          Loading the admin…
        </p>
      }
    >
      <AdminApp />
    </Suspense>
  );
}
