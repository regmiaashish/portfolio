import { useContent } from "../../hooks/useContent";
import { Panel } from "../console/Panel";
import { Readout, ReadoutList } from "../console/Readout";
import { Container } from "../layout/Container";
import styles from "./AboutIntro.module.css";
import { currentRole } from "./careerUtils";

/** Top of the about page: the profile summary beside a "whoami" readout of real content. */
export function AboutIntro() {
  const { profile, career } = useContent().content;
  const current = currentRole(career);
  const inKathmandu = /kathmandu/i.test(profile.location);
  return (
    <div className={styles.intro}>
      <Container className={styles.layout}>
        <p className={styles.lead}>{profile.summary}</p>
        <Panel title="whoami" aria-label="Profile summary" className={styles.panel}>
          <ReadoutList minColumn="11rem">
            <Readout label="name">{profile.name}</Readout>
            <Readout label="role">{profile.role}</Readout>
            {current && (
              <Readout label="current">
                {current.role}, {current.company}
              </Readout>
            )}
            <Readout label="based in">{profile.location}</Readout>
            {inKathmandu && <Readout label="time zone">UTC+5:45</Readout>}
          </ReadoutList>
        </Panel>
      </Container>
    </div>
  );
}
