import styles from "./Console.module.css";

export type LightStatus = "idle" | "running" | "done" | "error" | "live" | "online" | "offline";

interface StatusLightProps {
  status: LightStatus;
  /** Always provided: colour is never the only cue. */
  label: string;
  /** Show the label as visible mono text next to the lamp (default) or only to screen readers. */
  showLabel?: boolean;
  className?: string;
}

/** A lamp with a glow for "live" and a breathing ring for live/running states. */
export function StatusLight({ status, label, showLabel = true, className }: StatusLightProps) {
  return (
    <span
      className={[styles.light, styles[status], className].filter(Boolean).join(" ")}
      data-status={status}
    >
      <span className={styles.lamp} aria-hidden="true" />
      <span className={showLabel ? "mono" : "visually-hidden"}>{label}</span>
    </span>
  );
}
