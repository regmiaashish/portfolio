import type { ElementType, ReactNode } from "react";

import styles from "./Console.module.css";

interface PanelProps {
  /** Short console-style label for the header bar, e.g. "agents.pipeline". Decorative. */
  title: ReactNode;
  /** Usually a <StatusLight/>, shown at the right of the header. */
  status?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  as?: ElementType;
  className?: string;
  bodyClassName?: string;
  /** Body without padding, e.g. for a table or an image. */
  flush?: boolean;
  "aria-labelledby"?: string;
  "aria-label"?: string;
  id?: string;
}

/**
 * A window onto part of the running system: a header bar (mono label, status, actions)
 * over a body. Put the real heading for assistive tech inside the body and point
 * aria-labelledby at it when the panel is a landmark (section/aside).
 */
export function Panel({
  title,
  status,
  actions,
  children,
  as: Tag = "div",
  className,
  bodyClassName,
  flush,
  ...rest
}: PanelProps) {
  return (
    <Tag className={[styles.panel, className].filter(Boolean).join(" ")} {...rest}>
      <div className={styles.panelHeader}>
        <span className={`mono ${styles.panelTitle}`}>{title}</span>
        {status && <span className={styles.panelStatus}>{status}</span>}
        {actions && <span className={styles.panelActions}>{actions}</span>}
      </div>
      <div className={[styles.panelBody, flush && styles.flush, bodyClassName].filter(Boolean).join(" ")}>
        {children}
      </div>
    </Tag>
  );
}
