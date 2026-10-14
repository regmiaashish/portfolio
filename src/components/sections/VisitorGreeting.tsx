import { useContent } from "../../hooks/useContent";
import { useVisitorContext } from "../../hooks/useVisitorContext";
import { buildGreeting, clockIn } from "../../lib/format";
import { StatusDot } from "../ui/StatusDot";
import styles from "./VisitorGreeting.module.css";

const MY_TIMEZONE = "Asia/Kathmandu";

/** Generic greeting for when the context API is unavailable; still useful, never broken. */
function fallbackGreeting(myCity: string) {
  const clock = clockIn(MY_TIMEZONE);
  return {
    primary: `Namaste from ${myCity}.`,
    secondary: clock ? `It's ${clock} here in Nepal (UTC+5:45).` : null,
  };
}

/**
 * The hero's one orchestrated moment: a skeleton while the Context Engine answers,
 * then a greeting personalised to the visitor's city, weather and time zone.
 */
export function VisitorGreeting() {
  const state = useVisitorContext();
  const myCity = useContent().content.profile.location.split(",")[0];
  const loading = state.status === "loading";
  const greeting = loading
    ? null
    : (state.status === "ready" ? buildGreeting(state.data, myCity) : null) ?? fallbackGreeting(myCity);

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
          <p className={styles.primary}>
            <StatusDot status="live" label="Live:" />
            <span>{greeting.primary}</span>
          </p>
          {greeting.secondary && <p className={styles.secondary}>{greeting.secondary}</p>}
        </>
      )}
    </div>
  );
}
