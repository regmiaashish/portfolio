import { profile } from "../../data/profile";
import { Container } from "../layout/Container";
import { Stack } from "../layout/Stack";
import { ButtonAnchor, ButtonLink } from "../ui/Button";
import { StatusDot } from "../ui/StatusDot";
import styles from "./Hero.module.css";
import { PitchPanel } from "./PitchPanel";

export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className={styles.hero}>
      <Container className={styles.layout}>
        <div>
          {/* Phase 3 replaces this with the live Context Engine greeting. */}
          <p className={styles.greeting}>
            <StatusDot status="live" label="Based in" />
            Namaste from {profile.location.split(",")[0]}.
          </p>
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
