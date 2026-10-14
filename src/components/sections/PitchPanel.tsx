import { isPitchEnabled } from "../../lib/features";
import { Panel } from "../console/Panel";
import { StatusLight } from "../console/StatusLight";
import { Button } from "../ui/Button";
import { Input } from "../ui/Field";
import { PitchDemo } from "./PitchDemo";
import { PitchGuardrails } from "./PitchGuardrails";
import styles from "./PitchPanel.module.css";
import { PitchPipeline } from "./PitchPipeline";

const IDLE_AGENTS = { researcher: "idle", matchmaker: "idle", writer: "idle" } as const;

/**
 * The Pitch Me workspace on /pitch. It ships dark: unless VITE_PITCH_ENABLED is "true" at
 * build time, visitors see the same pipeline at rest with an explanation, and nothing calls
 * the backend.
 */
export function PitchPanel() {
  const enabled = isPitchEnabled();
  return (
    <section id="pitch" aria-label="Pitch me" className={styles.workspace}>
      {enabled ? <PitchDemo /> : <ComingSoon />}
    </section>
  );
}

function ComingSoon() {
  return (
    <>
      <Panel
        as="section"
        aria-labelledby="pitch-pipeline-heading"
        title="agents.pipeline"
        status={<StatusLight status="idle" label="coming soon" />}
      >
        <h2 id="pitch-pipeline-heading" className="visually-hidden">
          Agent pipeline
        </h2>
        <PitchPipeline agents={IDLE_AGENTS} />
      </Panel>

      <div className={styles.grid}>
        <Panel
          as="section"
          aria-labelledby="pitch-request-heading"
          title="pitch.request"
          status={<StatusLight status="idle" label="offline" />}
        >
          <h2 id="pitch-request-heading" className={styles.panelHeading}>
            Your request
          </h2>
          <p className={styles.intro}>
            The demo is wired up and tested; it goes live once its keys and spending limits are
            in place. Coming soon.
          </p>
          <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
            <div className={styles.inputs}>
              <Input label="Company" name="company" placeholder="e.g. Spotify" disabled />
              <Input label="Role" name="role" placeholder="e.g. Backend" disabled />
            </div>
            <Button type="submit" variant="secondary" disabled>
              Pitch me (coming soon)
            </Button>
          </form>
        </Panel>

        <Panel as="section" aria-labelledby="pitch-guardrails-heading" title="how-it-works">
          <h2 id="pitch-guardrails-heading" className={styles.panelHeading}>
            How it works
          </h2>
          <p className={styles.intro}>
            A real multi-agent pipeline with the controls a paid AI feature needs in production.
          </p>
          <PitchGuardrails />
        </Panel>
      </div>
    </>
  );
}
