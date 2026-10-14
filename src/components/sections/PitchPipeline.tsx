import { AGENT_NAMES, type AgentName, type AgentState } from "../../hooks/usePitchStream";
import { AGENT_LABELS, AGENT_TASKS, linkState } from "../../lib/pitchPipeline";
import { StatusLight } from "../console/StatusLight";
import styles from "./PitchPipeline.module.css";

interface PitchPipelineProps {
  agents: Record<AgentName, AgentState>;
}

/** Researcher → matchmaker → writer as connected nodes; connectors light up as stages finish. */
export function PitchPipeline({ agents }: PitchPipelineProps) {
  return (
    <ol className={styles.pipeline} aria-label="Agent pipeline">
      {AGENT_NAMES.map((agent, index) => (
        <li
          key={agent}
          className={styles.node}
          data-state={agents[agent]}
          data-link={index < AGENT_NAMES.length - 1 ? linkState(agents, index) : undefined}
        >
          <span className={styles.nodeHead}>
            {/* A real sequence, so numbering it is meaningful. */}
            <span className={`mono ${styles.index}`} aria-hidden="true">
              0{index + 1}
            </span>
            <StatusLight status={agents[agent]} label={agents[agent]} />
          </span>
          <span className={styles.name}>{AGENT_LABELS[agent]}</span>
          <span className={styles.task}>{AGENT_TASKS[agent]}</span>
        </li>
      ))}
    </ol>
  );
}
