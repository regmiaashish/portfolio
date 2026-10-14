import { sparklinePoints } from "../../lib/sparkline";
import styles from "./Console.module.css";

interface SparklineProps {
  values: number[];
  /** Describes the series for screen readers, e.g. "API latency, last 12 checks: 80 to 140 ms". */
  label: string;
  width?: number;
  height?: number;
}

/**
 * A tiny trend line. One value draws a single point (a short level segment ending in a dot);
 * no values at all shows a dashed placeholder.
 */
export function Sparkline({ values, label, width = 64, height = 16 }: SparklineProps) {
  const points = sparklinePoints(values, width, height);
  const last = points.split(" ").at(-1)?.split(",");
  return (
    <svg
      className={styles.sparkline}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
    >
      {points ? (
        <>
          <polyline className={styles.sparkLine} points={points} />
          {last && <circle className={styles.sparkDot} cx={last[0]} cy={last[1]} r={2} />}
        </>
      ) : values.length === 1 ? (
        <>
          <line
            className={styles.sparkLine}
            x1={width - 12}
            x2={width - 2}
            y1={height / 2}
            y2={height / 2}
          />
          <circle className={styles.sparkDot} cx={width - 2} cy={height / 2} r={2} />
        </>
      ) : (
        <line
          className={`${styles.sparkLine} ${styles.sparkEmpty}`}
          x1={2}
          x2={width - 2}
          y1={height / 2}
          y2={height / 2}
        />
      )}
    </svg>
  );
}
