import { profile } from "../../data/profile";
import { Section } from "../layout/Section";
import { Icon } from "../ui/Icon";
import { SOCIAL_ICONS } from "../ui/socialIcons";
import styles from "./Contact.module.css";
import { ContactForm } from "./ContactForm";

/** The form posts to the API; the email link stays visible as the fallback when it's down. */
export function Contact() {
  return (
    <Section
      id="contact"
      title="Let's talk"
      intro="Hiring for a backend or AI role, or have a project in mind? Send a message here or email me directly."
    >
      <div className={styles.layout}>
        <ContactForm />

        <div className={styles.direct}>
          <h3 className={styles.directTitle}>Or reach me directly</h3>
          <a className={styles.email} href={`mailto:${profile.email}`}>
            <Icon name="mail" size={24} />
            {profile.email}
          </a>
          <ul className={styles.details}>
            <li>
              <a href={profile.phone.href}>
                <Icon name="phone" />
                {profile.phone.display}
              </a>
            </li>
            {profile.socials.map((social) => (
              <li key={social.label}>
                <a href={social.href} target="_blank" rel="noopener noreferrer">
                  <Icon name={SOCIAL_ICONS[social.label]} />
                  {social.label}
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
