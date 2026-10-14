import { useContent } from "../../hooks/useContent";
import { Container } from "../layout/Container";
import { Stack } from "../layout/Stack";
import { Reveal } from "../motion/Reveal";
import { ButtonAnchor, ButtonLink } from "../ui/Button";
import styles from "./ContactBand.module.css";

/** Closing call to action on the home page. */
export function ContactBand() {
  const { profile } = useContent().content;
  return (
    <section aria-labelledby="contact-band-heading" className={styles.section}>
      <Container>
        <Reveal className={styles.band}>
          <div>
            <p className={`mono ${styles.label}`}>~/contact</p>
            <h2 id="contact-band-heading" className={styles.heading}>
              Hiring for a backend or AI role?
            </h2>
            <p className={styles.text}>
              Tell me about the team and the problem you want to solve.
            </p>
          </div>
          <Stack direction="row" gap={3}>
            <ButtonLink to="/contact" variant="primary">
              Get in touch
            </ButtonLink>
            <ButtonAnchor href={`mailto:${profile.email}`} variant="secondary">
              Email me
            </ButtonAnchor>
          </Stack>
        </Reveal>
      </Container>
    </section>
  );
}
