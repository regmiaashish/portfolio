import { isPitchEnabled } from "../../lib/features";
import { Panel } from "../console/Panel";
import { StatusLight } from "../console/StatusLight";
import { ButtonLink } from "../ui/Button";
import styles from "./AgentsTeaser.module.css";

const PIPELINE = [
  { agent: "researcher", task: "reads the web about the company" },
  { agent: "matchmaker", task: "matches it to my real projects" },
  { agent: "writer", task: "writes a three-sentence pitch" },
] as const;

/** Home-page preview of Pitch Me: the agent pipeline at rest, linking to the full demo. */
export function AgentsTeaser() {
  const enabled = isPitchEnabled();
  return (
    <Panel
      as="aside"
      aria-labelledby="agents-heading"
      title="agents.pipeline"
      status={
        <StatusLight status={enabled ? "live" : "idle"} label={enabled ? "ready" : "coming soon"} />
      }
      className={styles.panel}
    >
      <h2 id="agents-heading" className={styles.heading}>
        Let three AI agents pitch me
      </h2>
      <p className={styles.intro}>
        Give it a company and a role. The agents research it, match it to my work and write you a
        short pitch, live.
      </p>

      <ol className={styles.pipeline} aria-label="Agent pipeline">
        {PIPELINE.map((step, index) => (
          <li key={step.agent} className={styles.step}>
            <span className={`mono ${styles.index}`} aria-hidden="true">
              0{index + 1}
            </span>
            <span className={styles.stepText}>
              <span className={`mono ${styles.agent}`}>{step.agent}</span>
              <span className={styles.task}>{step.task}</span>
            </span>
            <StatusLight status="idle" label="idle" />
          </li>
        ))}
      </ol>

      <ButtonLink to="/pitch" variant="secondary" className={styles.cta}>
        {enabled ? "Open Pitch Me" : "Preview Pitch Me"}
      </ButtonLink>
    </Panel>
  );
}
