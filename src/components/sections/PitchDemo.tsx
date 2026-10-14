import {
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { AGENT_NAMES, type PitchError, usePitchStream } from "../../hooks/usePitchStream";
import { useTheme } from "../../hooks/useTheme";
import { useTurnstile } from "../../hooks/useTurnstile";
import { PITCH_MAX_LENGTH, type PitchField, validatePitchField } from "../../lib/pitchValidation";
import { Button } from "../ui/Button";
import { Input } from "../ui/Field";
import { StatusDot } from "../ui/StatusDot";
import styles from "./PitchPanel.module.css";

const AGENT_LABELS = { researcher: "Researcher", matchmaker: "Matchmaker", writer: "Writer" };
const FIELD_IDS: Record<PitchField, string> = { company: "pitch-company", role: "pitch-role" };
const COPIED_FOR_MS = 2000;

type Values = Record<PitchField, string>;
type Errors = Partial<Record<PitchField, string>>;

function errorText(error: PitchError): string {
  if (error.code === "daily_cap" || error.code === "disabled") {
    return `${error.message} You can still email me directly.`;
  }
  return error.message;
}

/** The live Pitch Me form, agent progress, log and streamed pitch. */
export function PitchDemo() {
  const { theme } = useTheme();
  const turnstile = useTurnstile(import.meta.env.VITE_TURNSTILE_SITE_KEY, theme);
  const { state, start } = usePitchStream();

  const [values, setValues] = useState<Values>({ company: "", role: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const logRef = useRef<HTMLOListElement>(null);

  const running = state.status === "running";
  const finished = state.status === "done" || state.status === "error";
  const resetTurnstile = turnstile.reset;

  // Turnstile tokens are single-use: get a fresh one after every run.
  useEffect(() => {
    if (finished) resetTurnstile();
  }, [finished, resetTurnstile]);

  useEffect(() => {
    if (copy !== "copied") return;
    const timer = setTimeout(() => setCopy("idle"), COPIED_FOR_MS);
    return () => clearTimeout(timer);
  }, [copy]);

  // Keep the newest log line in view.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [state.log.length]);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as PitchField;
    setValues((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: validatePitchField(field, event.target.value) }));
    }
  };

  const onBlur = (event: FocusEvent<HTMLInputElement>) => {
    const field = event.target.name as PitchField;
    if (!event.target.value && !errors[field]) return;
    setErrors((current) => ({ ...current, [field]: validatePitchField(field, event.target.value) }));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (running) return;

    const found: Errors = {
      company: validatePitchField("company", values.company),
      role: validatePitchField("role", values.role),
    };
    setErrors(found);
    const firstInvalid = (["company", "role"] as const).find((field) => found[field]);
    if (firstInvalid) {
      document.getElementById(FIELD_IDS[firstInvalid])?.focus();
      return;
    }
    if (turnstile.enabled && !turnstile.token) {
      setFormError("Please complete the verification check first.");
      return;
    }

    setFormError(null);
    setCopy("idle");
    void start(values.company.trim(), values.role.trim(), turnstile.token ?? undefined);
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(state.text);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  };

  const showResults = state.status !== "idle" || state.text !== "";

  return (
    <>
      <p className={styles.intro}>
        Name a company and a role. Three agents research it, match it to my work and write a short
        pitch, live.
      </p>

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <div className={styles.inputs}>
          <Input
            id={FIELD_IDS.company}
            label="Company"
            name="company"
            placeholder="e.g. Spotify"
            autoComplete="off"
            maxLength={PITCH_MAX_LENGTH}
            value={values.company}
            onChange={onChange}
            onBlur={onBlur}
            error={errors.company}
            disabled={running}
          />
          <Input
            id={FIELD_IDS.role}
            label="Role"
            name="role"
            placeholder="e.g. Backend"
            autoComplete="off"
            maxLength={PITCH_MAX_LENGTH}
            value={values.role}
            onChange={onChange}
            onBlur={onBlur}
            error={errors.role}
            disabled={running}
          />
        </div>
        {turnstile.enabled && <div ref={turnstile.containerRef} className={styles.turnstile} />}
        {formError && (
          <p className={styles.error} role="alert">
            {formError}
          </p>
        )}
        <Button type="submit" variant="secondary" disabled={running} aria-busy={running}>
          {running ? "Pitching…" : "Pitch me"}
        </Button>
      </form>

      <ul className={styles.agents} aria-label="Agents">
        {AGENT_NAMES.map((agent) => (
          <li key={agent} className={styles.agent}>
            <StatusDot status={state.agents[agent]} />
            {AGENT_LABELS[agent]}
            <span className={styles.agentState} aria-hidden="true">
              {state.agents[agent]}
            </span>
          </li>
        ))}
      </ul>

      {/* Announces only the outcome; streamed tokens would overwhelm a screen reader. */}
      <p className="visually-hidden" role="status">
        {state.status === "done" ? "Your pitch is ready." : ""}
      </p>

      {showResults && (
        <div className={styles.results}>
          {state.log.length > 0 && (
            <ol ref={logRef} className={styles.log} role="log" aria-label="Agent log">
              {state.log.map((entry, index) => (
                <li key={index}>
                  <span className={styles.logAgent}>{entry.agent}</span> {entry.message}
                </li>
              ))}
            </ol>
          )}

          <section aria-labelledby="pitch-output-heading" className={styles.outputBlock}>
            <h3 id="pitch-output-heading" className={styles.outputHeading}>
              Your pitch
            </h3>
            <p className={styles.output}>
              {state.text ||
                (running ? <span className={styles.waiting}>Waiting for the writer…</span> : null)}
              {running && <span className={styles.caret} aria-hidden="true" />}
            </p>
            {state.status === "done" && state.cached && (
              <p className={styles.note}>Cached result: this pitch was written earlier today.</p>
            )}
            {state.status === "error" && state.error && (
              <p className={styles.error} role="alert">
                {errorText(state.error)}
              </p>
            )}
            <div className={styles.outputActions}>
              <Button
                variant="secondary"
                size="sm"
                onClick={onCopy}
                disabled={state.status !== "done" || !state.text}
              >
                {copy === "copied" ? "Copied" : "Copy pitch"}
              </Button>
              {copy === "failed" && (
                <p className={styles.note} role="status">
                  Couldn't copy automatically. Select the text and copy it.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
