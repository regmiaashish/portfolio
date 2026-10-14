import type { HTMLAttributes, ReactNode } from "react";

import styles from "./Chip.module.css";

export function Chip({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={[styles.chip, className].filter(Boolean).join(" ")} {...rest} />;
}

/** A labelled list of chips, e.g. a project's stack. */
export function ChipList({ items, label }: { items: ReactNode[]; label: string }) {
  return (
    <ul className={styles.list} aria-label={label}>
      {items.map((item, index) => (
        <li key={index}>
          <Chip>{item}</Chip>
        </li>
      ))}
    </ul>
  );
}
