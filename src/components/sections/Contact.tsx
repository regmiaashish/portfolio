import { profile } from "../../data/profile";
import { Section } from "../layout/Section";
import { Icon } from "../ui/Icon";
import { SOCIAL_ICONS } from "../ui/socialIcons";
import styles from "./Contact.module.css";

/** Phase 3 adds the contact form; email stays as the always-available fallback. */
export function Contact() {
  return (
    <Section
      id="contact"
      title="Let's talk"
      intro="Hiring for a backend or AI role, or have a project in mind? Email is the fastest way to reach me."
    >
      <a className={styles.email} href={`mailto:${profile.email}`}>
        <Icon name="mail" size={28} />
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
    </Section>
  );
}
