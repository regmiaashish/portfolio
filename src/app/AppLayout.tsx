import { Outlet } from "react-router";

import { Footer } from "../components/layout/Footer";
import { Header } from "../components/layout/Header";
import { StatusBar } from "../components/layout/StatusBar";
import styles from "./App.module.css";
import { ErrorBoundary } from "./ErrorBoundary";
import { ScrollManager } from "./ScrollManager";

export function AppLayout() {
  return (
    <div className={styles.shell}>
      <div className="console-backdrop" aria-hidden="true" />
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <Header />
      <StatusBar />
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
