import styles from "./PitchPanel.module.css";

/**
 * How the demo protects itself and its budget. Every line describes real backend behaviour;
 * the daily cap's size is server configuration, so it is deliberately not stated.
 */
const GUARDRAILS = [
  {
    label: "grounded",
    text: "The matchmaker only uses my published projects and career. It never invents experience.",
  },
  {
    label: "untrusted input",
    text: "Your input and the web research are treated as data; instructions hidden in them are ignored.",
  },
  {
    label: "rate limit",
    text: "3 runs per minute per visitor, plus a daily cap across everyone.",
  },
  {
    label: "cache",
    text: "Asking again for the same company and role replays the earlier pitch instead of re-running the agents.",
  },
  {
    label: "bot check",
    text: "A Cloudflare Turnstile check runs before any agent starts.",
  },
  {
    label: "privacy",
    text: "Only what you type and the pitch it produced are kept, to review usage. No IP addresses.",
  },
] as const;

export function PitchGuardrails() {
  return (
    <ul className={styles.guardrails}>
      {GUARDRAILS.map((item) => (
        <li key={item.label} className={styles.guardrail}>
          <span className={`mono ${styles.guardrailLabel}`}>{item.label}</span>
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}
