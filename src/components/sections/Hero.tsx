import { useContent } from "../../hooks/useContent";
import { Container } from "../layout/Container";
import { Stack } from "../layout/Stack";
import { ButtonAnchor, ButtonLink } from "../ui/Button";
import styles from "./Hero.module.css";
import { PitchPanel } from "./PitchPanel";
import { VisitorGreeting } from "./VisitorGreeting";

export function Hero() {
  const { profile } = useContent().content;
  return (
    <section aria-labelledby="hero-heading" className={styles.hero}>
      <Container className={styles.layout}>
        <div>
          <VisitorGreeting />
          <h1 id="hero-heading" className={styles.title}>
            {profile.tagline}
          </h1>
          <p className={styles.summary}>{profile.summary}</p>
          <Stack direction="row" gap={3} className={styles.actions}>
            <ButtonAnchor variant="primary" href={`mailto:${profile.email}`}>
              Email me
            </ButtonAnchor>
            <ButtonLink variant="secondary" to="/#work">
              See my work
            </ButtonLink>
          </Stack>
        </div>
        <PitchPanel />
      </Container>
    </section>
  );
}
