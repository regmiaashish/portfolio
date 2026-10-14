import type { PropsWithChildren } from "react";
import { useLocation } from "react-router";

import { Container } from "../components/layout/Container";
import { Button } from "../components/ui/Button";
import { useAdminSession } from "./adminContent";
import styles from "./Admin.module.css";
import { GuardedLink } from "./components/GuardedLink";
import { useLeaveGuard } from "./unsaved";

const TABS = [
  { label: "Profile", to: "/admin/profile" },
  { label: "Projects", to: "/admin/projects" },
  { label: "Career", to: "/admin/career" },
  { label: "Skills", to: "/admin/skills" },
  { label: "Pitch history", to: "/admin/pitches" },
];

export function AdminShell({ children }: PropsWithChildren) {
  const { userName, signOut } = useAdminSession();
  const { pathname } = useLocation();
  const canLeave = useLeaveGuard();

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Container className={styles.topbarInner}>
          <p className={styles.brand}>Site admin</p>
          <div className={styles.topActions}>
            <span className={styles.user}>Signed in as {userName}</span>
            <GuardedLink to="/" className={styles.rowLink}>
              View site
            </GuardedLink>
            <Button
              size="sm"
              onClick={() => {
                if (canLeave()) void signOut();
              }}
            >
              Log out
            </Button>
          </div>
        </Container>
        <Container>
          <nav aria-label="Admin sections" className={styles.tabs}>
            <ul>
              {TABS.map((tab) => (
                <li key={tab.to}>
                  <GuardedLink
                    to={tab.to}
                    aria-current={pathname.startsWith(tab.to) ? "page" : undefined}
                  >
                    {tab.label}
                  </GuardedLink>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </header>
      <main id="main" className={styles.main}>
        <Container>{children}</Container>
      </main>
    </div>
  );
}
