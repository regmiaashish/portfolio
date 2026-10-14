import type { ReactNode } from "react";

import { Container } from "./Container";
import styles from "./Layout.module.css";

interface SectionProps {
  id: string;
  title: ReactNode;
  intro?: ReactNode;
  /** Console-style label above the heading, e.g. "~/work". */
  label?: string;
  /** A link or button aligned with the heading, e.g. "All work". */
  action?: ReactNode;
  /** Drop the divider above the section (e.g. the first section after a page header). */
  plain?: boolean;
  children: ReactNode;
}

/** A landmark section with a heading that names it for assistive technology. */
export function Section({ id, title, intro, label, action, plain, children }: SectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={[styles.section, plain && styles.plain].filter(Boolean).join(" ")}
    >
      <Container>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            {label && <p className={`mono ${styles.label}`}>{label}</p>}
            <h2 id={headingId}>{title}</h2>
            {intro && <p className={styles.sectionIntro}>{intro}</p>}
          </div>
          {action && <div className={styles.sectionAction}>{action}</div>}
        </div>
        {children}
      </Container>
    </section>
  );
}
