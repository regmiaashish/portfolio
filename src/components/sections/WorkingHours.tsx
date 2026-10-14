import { useEffect, useState } from "react";

import { useVisitorContext } from "../../hooks/useVisitorContext";
import { clockIn, formatClock, formatHours, toNumber } from "../../lib/format";
import { Panel } from "../console/Panel";
import { Readout, ReadoutList } from "../console/Readout";
import { StatusLight } from "../console/StatusLight";
import styles from "./WorkingHours.module.css";
import {
  DAY_MINUTES,
  describeSegments,
  myHoursOnVisitorClock,
  overlapSegments,
  type Segment,
  visitorHours,
} from "./workingHours";

const KATHMANDU = "Asia/Kathmandu";

/** Kathmandu time computed in the browser, refreshed each minute (no API needed). */
function useKathmanduClock(): string | null {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return clockIn(KATHMANDU, now);
}

function Bar({ label, segments, variant }: { label: string; segments: Segment[]; variant: string }) {
  return (
    <div className={styles.row}>
      <span className={`mono ${styles.rowLabel}`}>{label}</span>
      <span className={styles.track}>
        {segments.map(([start, end]) => (
          <span
            key={start}
            className={`${styles.segment} ${styles[variant]}`}
            style={{
              left: `${(start / DAY_MINUTES) * 100}%`,
              width: `${((end - start) / DAY_MINUTES) * 100}%`,
            }}
          />
        ))}
      </span>
    </div>
  );
}

/**
 * The visitor's working day next to mine (09:00–18:00 in each time zone, the same definition
 * the API uses for the overlap figure). Falls back to Kathmandu time alone when the visitor's
 * context isn't available.
 */
export function WorkingHours() {
  const context = useVisitorContext();
  const kathmanduNow = useKathmanduClock();
  const data = context.status === "ready" ? context.data : null;

  const offset = toNumber(data?.utc_offset_minutes);
  const overlapHours = toNumber(data?.timezone_overlap_hours);
  const visitorTime = formatClock(data?.local_time);
  const myTime = formatClock(data?.my_local_time) ?? kathmanduNow;
  const city = data?.city?.trim() || null;

  const yours = visitorHours();
  const mine = offset === null ? null : myHoursOnVisitorClock(offset);
  const both = mine ? overlapSegments(yours, mine) : [];

  return (
    <Panel
      as="section"
      aria-labelledby="working-hours-heading"
      title="hours.overlap"
      status={
        data ? (
          <StatusLight status="online" label="your time zone" />
        ) : (
          <StatusLight status="idle" label="kathmandu only" />
        )
      }
    >
      <h2 id="working-hours-heading" className={styles.heading}>
        Working hours
      </h2>

      <ReadoutList minColumn="7rem" className={styles.readouts}>
        {visitorTime && <Readout label={city ? `you · ${city}` : "your time"}>{visitorTime}</Readout>}
        {myTime && <Readout label="me · kathmandu">{myTime}</Readout>}
        {overlapHours !== null && (
          <Readout label="overlap">{overlapHours > 0 ? formatHours(overlapHours) : "none"}</Readout>
        )}
      </ReadoutList>

      {mine && (
        <div
          className={styles.chart}
          role="img"
          aria-label={
            `On your clock: your working day is ${describeSegments(yours)}; mine is ` +
            `${describeSegments(mine)}` +
            (both.length ? `; they overlap ${describeSegments(both)}.` : "; they don't overlap.")
          }
        >
          <Bar label="you" segments={yours} variant="yours" />
          <Bar label="me" segments={mine} variant="mine" />
          <Bar label="both" segments={both} variant="both" />
          <div className={styles.axis} aria-hidden="true">
            {["00", "06", "12", "18", "24"].map((tick) => (
              <span key={tick} className="mono">
                {tick}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className={styles.note}>
        {overlapHours === null
          ? "I work from Kathmandu (UTC+5:45), 09:00–18:00 on working days."
          : overlapHours > 0
            ? `Our working days (09:00–18:00 in each time zone) overlap by about ${formatHours(overlapHours)}.`
            : "Our working days don't overlap, so I reply asynchronously."}
      </p>
    </Panel>
  );
}
