import type { CSSProperties, ReactNode } from "react";

import styles from "./Console.module.css";

interface ReadoutProps {
  label: string;
  children: ReactNode;
  unit?: string;
}

/** One label/value pair of real data. Must be used inside <ReadoutList> (a <dl>). */
export function Readout({ label, children, unit }: ReadoutProps) {
  return (
    <div className={styles.readout}>
      <dt className={`mono ${styles.readoutLabel}`}>{label}</dt>
      <dd className={styles.readoutValue}>
        {children}
        {unit && <span className={`mono ${styles.readoutUnit}`}>{unit}</span>}
      </dd>
    </div>
  );
}

interface ReadoutListProps {
  children: ReactNode;
  /** Narrowest column before wrapping, e.g. "9rem". */
  minColumn?: string;
  className?: string;
  "aria-label"?: string;
}

export function ReadoutList({ children, minColumn, className, ...rest }: ReadoutListProps) {
  const style = minColumn ? ({ "--readout-min": minColumn } as CSSProperties) : undefined;
  return (
    <dl className={[styles.readouts, className].filter(Boolean).join(" ")} style={style} {...rest}>
      {children}
    </dl>
  );
}
