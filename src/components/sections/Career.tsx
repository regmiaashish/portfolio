import { career } from "../../data/career";
import { Section } from "../layout/Section";
import styles from "./Career.module.css";

export function Career() {
  return (
    <Section id="career" title="Career">
      <ol className={styles.timeline}>
        {career.map((entry) => (
          <li key={`${entry.company}-${entry.role}`} className={styles.entry}>
            <p className={styles.period}>{entry.period}</p>
            <div className={styles.body}>
              <h3>{entry.role}</h3>
              <p className={styles.company}>{entry.company}</p>
              <p className={styles.summary}>{entry.summary}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
