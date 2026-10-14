import { useContent } from "../../hooks/useContent";
import { isPitchEnabled } from "../../lib/features";
import { Container } from "../layout/Container";
import { Stack } from "../layout/Stack";
import { ButtonLink } from "../ui/Button";
import { AgentsTeaser } from "./AgentsTeaser";
import styles from "./Hero.module.css";
import { VisitorGreeting } from "./VisitorGreeting";

/**
 * Marigold (primary) is used once per view: on the action that works best right now.
 * While Pitch Me ships dark that is "See my work"; once it's switched on, "Pitch me".
 */
export function Hero() {
  const { profile } = useContent().content;
  const pitchOn = isPitchEnabled();
  return (
    <section aria-labelledby="hero-heading" className={styles.hero}>
      <Container className={styles.layout}>
        <div className={styles.copy}>
          <VisitorGreeting />
          <h1 id="hero-heading" className={styles.title}>
            {profile.tagline}
          </h1>
          <p className={styles.summary}>{profile.summary}</p>
          <Stack direction="row" gap={3} className={styles.actions}>
            <ButtonLink variant={pitchOn ? "secondary" : "primary"} to="/work">
              See my work
            </ButtonLink>
            <ButtonLink variant={pitchOn ? "primary" : "secondary"} to="/pitch">
              Pitch me
            </ButtonLink>
            {profile.resume_url && (
              <ButtonLink variant="ghost" to="/resume">
                View résumé
              </ButtonLink>
            )}
          </Stack>
        </div>
        <AgentsTeaser />
      </Container>
    </section>
  );
}
