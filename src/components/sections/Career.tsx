import { useContent } from "../../hooks/useContent";
import { StatusLight } from "../console/StatusLight";
import { Section } from "../layout/Section";
import { Reveal } from "../motion/Reveal";
import styles from "./Career.module.css";
import { isCurrentPeriod } from "./careerUtils";

/** A vertical timeline; the role held today is lit as "now". */
export function Career() {
  const { career } = useContent().content;
  return (
    <Section id="career" label="~/about/career" title="Career">
      <ol className={styles.timeline}>
        {career.map((entry, index) => {
          const current = isCurrentPeriod(entry.period);
          return (
            <li
              key={entry.id}
              className={[styles.entry, current && styles.current].filter(Boolean).join(" ")}
            >
              <span className={styles.node} aria-hidden="true" />
              <Reveal className={styles.card} delayMs={index * 70}>
                <div className={styles.meta}>
                  {current ? (
                    <StatusLight status="live" label="now" />
                  ) : (
                    <span className={`mono ${styles.period}`}>{entry.period}</span>
                  )}
                  <span className={`mono ${styles.company}`}>{entry.company}</span>
                </div>
                <h3 className={styles.role}>{entry.role}</h3>
                <p className={styles.summary}>{entry.summary}</p>
              </Reveal>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
