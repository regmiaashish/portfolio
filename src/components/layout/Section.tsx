import type { ReactNode } from "react";

import { Container } from "./Container";
import styles from "./Layout.module.css";

interface SectionProps {
  id: string;
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
}

/** A landmark section with a heading that names it for assistive technology. */
export function Section({ id, title, intro, children }: SectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className={styles.section}>
      <Container>
        <div className={styles.sectionHeader}>
          <h2 id={headingId}>{title}</h2>
          {intro && <p className={styles.sectionIntro}>{intro}</p>}
        </div>
        {children}
      </Container>
    </section>
  );
}
