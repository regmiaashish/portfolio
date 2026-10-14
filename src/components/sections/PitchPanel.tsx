import { Button } from "../ui/Button";
import { Input } from "../ui/Field";
import { StatusDot } from "../ui/StatusDot";
import styles from "./PitchPanel.module.css";

const AGENTS = ["Researcher", "Matchmaker", "Writer"] as const;

/**
 * Shell for the Pitch Me demo. Phase 4 connects it to the streaming multi-agent
 * backend; until then the controls are disabled and say so.
 */
export function PitchPanel() {
  return (
    <aside id="pitch" aria-labelledby="pitch-heading" className={styles.panel}>
      <h2 id="pitch-heading">Pitch me</h2>
      <p className={styles.intro}>
        Name a company and a role, and three agents research it, match it to my work and write a
        short pitch. Coming soon.
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

      <ul className={styles.agents} aria-label="Agents">
        {AGENTS.map((agent) => (
          <li key={agent} className={styles.agent}>
            <StatusDot status="idle" />
            {agent}
            <span className={styles.agentState} aria-hidden="true">
              idle
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
