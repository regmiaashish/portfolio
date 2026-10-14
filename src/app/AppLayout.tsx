import { Outlet } from "react-router";

import { Footer } from "../components/layout/Footer";
import { Header } from "../components/layout/Header";
import styles from "./App.module.css";
import { ErrorBoundary } from "./ErrorBoundary";
import { ScrollManager } from "./ScrollManager";

export function AppLayout() {
  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1} className={styles.main}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <ScrollManager />
    </div>
  );
}
