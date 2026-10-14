import type { ReactNode } from "react";

import { Container } from "./Container";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  /** Console path for the page, e.g. "~/work". */
  path: string;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
}

/** The top of every inner page: a mono path, the page's one h1 and an intro. */
export function PageHeader({ path, title, intro, children }: PageHeaderProps) {
  return (
    <div className={styles.pageHeader}>
      <Container>
        <p className={`mono ${styles.path}`}>
          <span aria-hidden="true">$ cd </span>
          {path}
        </p>
        <h1 className={styles.title}>{title}</h1>
        {intro && <p className={styles.intro}>{intro}</p>}
        {children && <div className={styles.extra}>{children}</div>}
      </Container>
    </div>
  );
}
