import { useContent } from "../../hooks/useContent";
import { Panel } from "../console/Panel";
import { Container } from "../layout/Container";
import { TransitionLink } from "../motion/TransitionLink";
import { Icon } from "../ui/Icon";
import { SOCIAL_ICONS } from "../ui/socialIcons";
import styles from "./Contact.module.css";
import { ContactForm } from "./ContactForm";
import { WorkingHours } from "./WorkingHours";

/**
 * The contact page body: the form (posts to the API) beside direct channels and working hours.
 * The email link is always shown as the fallback for when the form or the API is down.
 */
export function Contact() {
  const { profile } = useContent().content;
  return (
    <div className={styles.contact}>
      <Container className={styles.layout}>
        <Panel
          as="section"
          aria-labelledby="contact-form-heading"
          title="message.compose"
          className={styles.formPanel}
        >
          <h2 id="contact-form-heading" className={styles.heading}>
            Send a message
          </h2>
          <ContactForm />
        </Panel>

        <div className={styles.side}>
          <Panel as="section" aria-labelledby="channels-heading" title="channels">
            <h2 id="channels-heading" className={styles.heading}>
              Reach me directly
            </h2>
            <a className={styles.email} href={`mailto:${profile.email}`}>
              <Icon name="mail" size={22} />
              {/* Let long addresses wrap after the "@" rather than mid-word on narrow screens. */}
              <span>
                {profile.email.split("@")[0]}@<wbr />
                {profile.email.split("@").slice(1).join("@")}
              </span>
            </a>
            <p className={styles.fallback}>
              Email always works, even if the form doesn&apos;t.
            </p>
            <ul className={styles.channels}>
              {profile.phone && (
                <li>
                  <a href={profile.phone.href}>
                    <Icon name="phone" />
                    {profile.phone.display}
                  </a>
                </li>
              )}
              {profile.resume_url && (
                <li>
                  <TransitionLink to="/resume">
                    <Icon name="document" />
                    Résumé
                  </TransitionLink>
                </li>
              )}
              {profile.socials.map((social) => (
                <li key={social.href}>
                  <a href={social.href} target="_blank" rel="noopener noreferrer">
                    <Icon name={SOCIAL_ICONS[social.kind]} />
                    {social.label}
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </Panel>

          <WorkingHours />
        </div>
      </Container>
    </div>
  );
}
