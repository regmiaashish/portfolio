import {
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { type PitchError, type PitchState, usePitchStream } from "../../hooks/usePitchStream";
import { useTheme } from "../../hooks/useTheme";
import { useTurnstile } from "../../hooks/useTurnstile";
import { pipelineLamp } from "../../lib/pitchPipeline";
import { PITCH_MAX_LENGTH, type PitchField, validatePitchField } from "../../lib/pitchValidation";
import { Panel } from "../console/Panel";
import { StatusLight } from "../console/StatusLight";
import { Button } from "../ui/Button";
import { Input } from "../ui/Field";
import { PitchGuardrails } from "./PitchGuardrails";
import styles from "./PitchPanel.module.css";
import { PitchPipeline } from "./PitchPipeline";
const FIELD_IDS: Record<PitchField, string> = { company: "pitch-company", role: "pitch-role" };
const COPIED_FOR_MS = 2000;

type Values = Record<PitchField, string>;
type Errors = Partial<Record<PitchField, string>>;

function outputLamp(state: PitchState): { status: "idle" | "running" | "done" | "error"; label: string } {
  if (state.status === "running") return { status: "running", label: state.text ? "streaming" : "thinking" };
  if (state.status === "done") return { status: "done", label: state.cached ? "cached" : "ready" };
  if (state.status === "error") return { status: "error", label: "error" };
  return { status: "idle", label: "waiting" };
}

function errorText(error: PitchError): string {
  if (error.code === "daily_cap" || error.code === "disabled") {
    return `${error.message} You can still email me directly.`;
  }
  return error.message;
}

/** The live Pitch Me form, agent progress, log and streamed pitch. */
export function PitchDemo() {
  const { theme } = useTheme();
  // The container setter is kept apart: it's used as a `ref`, and the React Compiler treats any
  // object a ref is read from as a ref, which would make every other turnstile.* read "unsafe".
  const { containerRef: turnstileContainer, ...turnstile } = useTurnstile(
    import.meta.env.VITE_TURNSTILE_SITE_KEY,
    theme,
  );
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

  const lamp = pipelineLamp(state.status, state.cached);
  const output = outputLamp(state);

  return (
    <>
      <Panel
        as="section"
        aria-labelledby="pitch-pipeline-heading"
        title="agents.pipeline"
        status={<StatusLight status={lamp.status} label={lamp.label} />}
      >
        <h2 id="pitch-pipeline-heading" className="visually-hidden">
          Agent pipeline
        </h2>
        <PitchPipeline agents={state.agents} />
      </Panel>

      <div className={styles.grid}>
        <div className={styles.column}>
          <Panel as="section" aria-labelledby="pitch-request-heading" title="pitch.request">
            <h2 id="pitch-request-heading" className={styles.panelHeading}>
              Your request
            </h2>
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
              {turnstile.enabled && <div ref={turnstileContainer} className={styles.turnstile} />}
              {formError && (
                <p className={styles.error} role="alert">
                  {formError}
                </p>
              )}
              <Button type="submit" variant="secondary" disabled={running} aria-busy={running}>
                {running ? "Pitching…" : "Pitch me"}
              </Button>
            </form>
          </Panel>

          <Panel
            as="section"
            aria-labelledby="pitch-log-heading"
            title="agents.log"
            actions={
              <span className="mono" aria-hidden="true">
                {state.log.length} {state.log.length === 1 ? "event" : "events"}
              </span>
            }
          >
            <h2 id="pitch-log-heading" className="visually-hidden">
              Agent log
            </h2>
            {/* Present from the start so assistive tech tracks it as a live log. */}
            <ol ref={logRef} className={styles.log} role="log" aria-label="Agent log">
              {state.log.map((entry, index) => (
                <li key={index} className={styles.logLine}>
                  <span className={styles.logAgent}>{entry.agent}</span>
                  <span>{entry.message}</span>
                </li>
              ))}
            </ol>
            {state.log.length === 0 && (
              <p className={`mono ${styles.empty}`}>
                Each agent reports here as it works. Start a run to watch.
              </p>
            )}
          </Panel>
        </div>

        <Panel
          as="section"
          aria-labelledby="pitch-output-heading"
          title="pitch.output"
          status={<StatusLight status={output.status} label={output.label} />}
          className={styles.outputPanel}
        >
          <h2 id="pitch-output-heading" className={styles.panelHeading}>
            Your pitch
          </h2>
          <p className={styles.output}>
            {state.text ||
              (running ? (
                <span className={styles.waiting}>Waiting for the writer…</span>
              ) : (
                <span className={styles.waiting}>
                  Your pitch appears here, written live by the writer agent.
                </span>
              ))}
            {running && <span className={styles.caret} aria-hidden="true" />}
          </p>
          {/* Announces only the outcome; streamed tokens would overwhelm a screen reader. */}
          <p className="visually-hidden" role="status">
            {state.status === "done" ? "Your pitch is ready." : ""}
          </p>
          {state.status === "done" && state.cached && (
            <p className={styles.note}>Cached result: replayed from an earlier run, so no agents were re-run.</p>
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
        </Panel>
      </div>

      <Panel as="section" aria-labelledby="pitch-guardrails-heading" title="how-it-works">
        <h2 id="pitch-guardrails-heading" className={styles.panelHeading}>
          How it works
        </h2>
        <PitchGuardrails />
      </Panel>
    </>
  );
}
