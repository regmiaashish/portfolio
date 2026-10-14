import { useApiHealth } from "../../hooks/useApiHealth";
import { useClock } from "../../hooks/useClock";
import { useContent } from "../../hooks/useContent";
import { Sparkline } from "../console/Sparkline";
import { StatusLight } from "../console/StatusLight";
import { Container } from "./Container";
import styles from "./StatusBar.module.css";

const MY_TIMEZONE = "Asia/Kathmandu";

function latencyLabel(samples: number[]): string {
  if (samples.length === 0) return "API latency: no measurements yet";
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const count = samples.length;
  const range = min === max ? `${min} ms` : `${min} to ${max} ms`;
  return `API latency over the last ${count} ${count === 1 ? "check" : "checks"}: ${range}`;
}

/**
 * Live system status, all of it real: API reachability and latency measured in this browser,
 * the time in Kathmandu, and how many projects are published. Not a live region: it updates
 * every 30 s and must not interrupt screen-reader users.
 */
export function StatusBar() {
  const health = useApiHealth();
  const clock = useClock(MY_TIMEZONE);
  const projectCount = useContent().content.projects.length;
  const latest = health.samples.at(-1);

  const apiText =
    health.status === "checking"
      ? "checking…"
      : health.status === "online"
        ? latest !== undefined
          ? `${latest} ms`
          : "online"
        : "showing cached content";

  return (
    <aside className={styles.bar} aria-label="Live system status" data-testid="status-bar">
      <Container>
        <ul className={`mono ${styles.inner}`}>
          <li className={styles.item}>
            <StatusLight
              status={health.status === "checking" ? "idle" : health.status}
              label={
                health.status === "offline" ? "api offline" : health.status === "online" ? "api online" : "api"
              }
            />
            <span className={styles.value}>{apiText}</span>
            {health.status !== "offline" && (
              <span className={styles.optional}>
                <Sparkline values={health.samples} label={latencyLabel(health.samples)} />
              </span>
            )}
          </li>
          <li className={styles.divider} aria-hidden="true" />
          {clock && (
            <li className={styles.item}>
              kathmandu <span className={styles.value}>{clock}</span>{" "}
              <span className={styles.optional}>utc+5:45</span>
            </li>
          )}
          <li className={`${styles.item} ${styles.push} ${styles.optional}`}>
            <span className={styles.value}>{projectCount}</span>{" "}
            {projectCount === 1 ? "project live" : "projects live"}
          </li>
        </ul>
      </Container>
    </aside>
  );
}
