import type { HTMLAttributes } from "react";

import styles from "./Layout.module.css";

export function Container({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={[styles.container, className].filter(Boolean).join(" ")} {...rest} />;
}
