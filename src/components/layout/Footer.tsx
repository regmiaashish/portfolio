import { profile } from "../../data/profile";
import { Icon } from "../ui/Icon";
import { SOCIAL_ICONS } from "../ui/socialIcons";
import { Container } from "./Container";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <Container className={styles.inner}>
        <p>
          © {new Date().getFullYear()} {profile.name}. {profile.location}.
        </p>
        <ul className={styles.socials} aria-label="Social profiles">
          {profile.socials.map((social) => (
            <li key={social.label}>
              <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`${social.label} (opens in a new tab)`}>
                <Icon name={SOCIAL_ICONS[social.label]} />
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </footer>
  );
}
