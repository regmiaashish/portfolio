import { useContent } from "../../hooks/useContent";
import { useVisitorContext } from "../../hooks/useVisitorContext";
import { buildGreeting, clockIn, greetingTags } from "../../lib/format";
import { StatusLight } from "../console/StatusLight";
import styles from "./VisitorGreeting.module.css";

const MY_TIMEZONE = "Asia/Kathmandu";

/** Generic greeting for when the context API is unavailable; still useful, never broken. */
function fallbackGreeting(myCity: string) {
  const clock = clockIn(MY_TIMEZONE);
  return {
    primary: `Namaste from ${myCity}.`,
    secondary: clock ? `It's ${clock} here in Nepal (UTC+5:45).` : null,
    tags: [myCity.toLowerCase(), ...(clock ? [`${clock} npt`] : [])],
  };
}

/**
 * The hero's one orchestrated moment, styled as a console readout: a telemetry line
 * (live lamp + city, local time, overlap), then the greeting in plain words. A skeleton holds
 * the space while the Context Engine answers, so nothing below it moves.
 */
export function VisitorGreeting() {
  const state = useVisitorContext();
  const myCity = useContent().content.profile.location.split(",")[0];
  const loading = state.status === "loading";

  const personal =
    state.status === "ready" ? buildGreeting(state.data, myCity) : null;
  const greeting = loading
    ? null
    : personal
      ? { ...personal, tags: greetingTags(state.data) }
      : fallbackGreeting(myCity);

  return (
    <div
      className={[styles.greeting, greeting && styles.resolved].filter(Boolean).join(" ")}
      aria-live="polite"
      aria-busy={loading}
      data-testid="visitor-greeting"
    >
      {loading || !greeting ? (
        <>
          <span className={styles.bar} aria-hidden="true" />
          <span className={styles.bar} aria-hidden="true" />
          <span className={styles.bar} aria-hidden="true" />
          <span className="visually-hidden">Loading a personalised greeting</span>
        </>
      ) : (
        <>
          <p className={`mono ${styles.telemetry}`}>
            <StatusLight status="live" label="live" />
            {greeting.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </p>
          <p className={styles.primary}>{greeting.primary}</p>
          {greeting.secondary && <p className={styles.secondary}>{greeting.secondary}</p>}
        </>
      )}
    </div>
  );
}
