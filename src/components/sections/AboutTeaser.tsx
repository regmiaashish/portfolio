import { useContent } from "../../hooks/useContent";
import { Panel } from "../console/Panel";
import { Readout, ReadoutList } from "../console/Readout";
import { Section } from "../layout/Section";
import { Reveal } from "../motion/Reveal";
import { TransitionLink } from "../motion/TransitionLink";
import styles from "./AboutTeaser.module.css";

/** Home-page summary of who I am, with a "whoami" readout built only from real content. */
export function AboutTeaser() {
  const { profile, career, skills } = useContent().content;
  const current = career[0];
  return (
    <Section id="about-teaser" label="~/about" title="About">
      <Reveal className={styles.layout}>
        <div className={styles.copy}>
          {current ? (
            <>
              <p className={`mono ${styles.now}`}>now</p>
              <p className={styles.summary}>{current.summary}</p>
            </>
          ) : (
            <p className={styles.summary}>{profile.summary}</p>
          )}
          <TransitionLink to="/about" className={styles.more}>
            Career, stack and how I work
          </TransitionLink>
        </div>
        <Panel title="whoami" aria-label="Profile summary">
          <ReadoutList minColumn="10rem">
            <Readout label="role">{profile.role}</Readout>
            {current && (
              <Readout label="current">
                {current.role}, {current.company}
              </Readout>
            )}
            <Readout label="based in">{profile.location}</Readout>
            <Readout label="time zone">UTC+5:45</Readout>
            {skills.length > 0 && (
              <Readout label="focus">{skills.map((group) => group.title).join(", ")}</Readout>
            )}
          </ReadoutList>
        </Panel>
      </Reveal>
    </Section>
  );
}
