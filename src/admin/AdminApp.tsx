import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useRoutes } from "react-router";

import { Button } from "../components/ui/Button";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ApiError } from "../lib/api";
import type { AdminUser } from "../lib/cmsContracts";
import { AdminSessionContext } from "./adminContent";
import { AdminContentProvider } from "./AdminContentProvider";
import { AdminShell } from "./AdminShell";
import { fetchCurrentUser, logout, onSessionExpired } from "./api";
import styles from "./Admin.module.css";
import { CareerFormPage, CareerPage } from "./pages/CareerPages";
import { LoginPage } from "./pages/LoginPage";
import { ProfileEditor } from "./pages/ProfileEditor";
import { ProjectFormPage } from "./pages/ProjectForm";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SkillFormPage, SkillsPage } from "./pages/SkillsPages";
import { UnsavedContext } from "./unsaved";

type Session =
  | { status: "checking" }
  | { status: "anonymous"; notice?: string }
  | { status: "forbidden"; user: AdminUser }
  | { status: "ready"; user: AdminUser };

/** Keeps the admin out of search results while it's open. */
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

function AdminRoutes() {
  return useRoutes([
    { index: true, element: <Navigate to="projects" replace /> },
    { path: "profile", element: <ProfileEditor /> },
    { path: "projects", element: <ProjectsPage /> },
    { path: "projects/new", element: <ProjectFormPage /> },
    { path: "projects/:id", element: <ProjectFormPage /> },
    { path: "career", element: <CareerPage /> },
    { path: "career/new", element: <CareerFormPage /> },
    { path: "career/:id", element: <CareerFormPage /> },
    { path: "skills", element: <SkillsPage /> },
    { path: "skills/new", element: <SkillFormPage /> },
    { path: "skills/:id", element: <SkillFormPage /> },
    { path: "*", element: <Navigate to="projects" replace /> },
  ]);
}

/** `/admin/*`: session gate plus the dashboard. Lazy-loaded, so visitors never download it. */
export default function AdminApp() {
  useNoIndex();
  useDocumentTitle("Site admin");
  const [session, setSession] = useState<Session>({ status: "checking" });
  const dirtyRef = useRef(false);

  const checkSession = useCallback(async () => {
    try {
      const user = await fetchCurrentUser();
      if (!user) setSession({ status: "anonymous" });
      else if (!user.is_superuser) setSession({ status: "forbidden", user });
      else setSession({ status: "ready", user });
    } catch (error) {
      setSession({
        status: "anonymous",
        notice: error instanceof ApiError ? error.message : "The server couldn't be reached.",
      });
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(
    () =>
      onSessionExpired(() => {
        dirtyRef.current = false;
        setSession({ status: "anonymous", notice: "Your session expired. Please sign in again." });
      }),
    [],
  );

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Cookies are cleared server-side when reachable; locally we sign out regardless.
    }
    dirtyRef.current = false;
    setSession({ status: "anonymous", notice: "You're signed out." });
  }, []);

  const sessionValue = useMemo(
    () => ({
      userName: session.status === "ready" ? session.user.name || session.user.email : "",
      signOut,
    }),
    [session, signOut],
  );

  let body;
  if (session.status === "checking") {
    body = (
      <main className={styles.loginCard}>
        <p role="status">Checking your session…</p>
      </main>
    );
  } else if (session.status === "anonymous") {
    body = <LoginPage notice={session.notice} onSignedIn={checkSession} />;
  } else if (session.status === "forbidden") {
    body = (
      <main className={styles.loginCard}>
        <h1>No admin access</h1>
        <p>
          {session.user.email} is signed in but isn't a site administrator.
        </p>
        <Button onClick={() => void signOut()}>Log out</Button>
      </main>
    );
  } else {
    body = (
      <AdminContentProvider>
        <AdminShell>
          <AdminRoutes />
        </AdminShell>
      </AdminContentProvider>
    );
  }

  return (
    <UnsavedContext.Provider value={dirtyRef}>
      <AdminSessionContext.Provider value={sessionValue}>{body}</AdminSessionContext.Provider>
    </UnsavedContext.Provider>
  );
}
