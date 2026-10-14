import type { CSSProperties, HTMLAttributes } from "react";

import styles from "./Layout.module.css";

type Space = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface StackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: Space;
  direction?: "column" | "row";
}

/** Evenly spaced children, vertically by default. */
export function Stack({ gap = 4, direction = "column", className, style, ...rest }: StackProps) {
  return (
    <div
      className={[styles.stack, direction === "row" && styles.row, className].filter(Boolean).join(" ")}
      style={{ gap: `var(--space-${gap})`, ...style }}
      {...rest}
    />
  );
}

interface GridProps extends HTMLAttributes<HTMLElement> {
  gap?: Space;
  /** Narrowest a column may get before the grid wraps, e.g. "18rem". */
  minColumn?: string;
  as?: "div" | "ul";
}

/** Responsive grid: as many columns as fit, never narrower than `minColumn`. */
export function Grid({ gap = 5, minColumn = "18rem", as: Tag = "div", className, style, ...rest }: GridProps) {
  return (
    <Tag
      className={[styles.grid, className].filter(Boolean).join(" ")}
      style={{ gap: `var(--space-${gap})`, "--grid-min": minColumn, ...style } as CSSProperties}
      {...rest}
    />
  );
}
