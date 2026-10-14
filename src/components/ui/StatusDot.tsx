import styles from "./StatusDot.module.css";

export type Status = "idle" | "running" | "done" | "error" | "live";

const LABELS: Record<Status, string> = {
  idle: "Idle",
  running: "Running",
  done: "Done",
  error: "Error",
  live: "Live",
};

/** A coloured dot with a text equivalent for screen readers (colour is never the only cue). */
export function StatusDot({ status, label = LABELS[status] }: { status: Status; label?: string }) {
  return (
    <>
      <span className={[styles.dot, status !== "idle" && styles[status]].filter(Boolean).join(" ")} aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </>
  );
}
