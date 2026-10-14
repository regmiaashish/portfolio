import { useContent } from "../../hooks/useContent";
import { TransitionLink } from "../motion/TransitionLink";
import { Icon } from "../ui/Icon";
import { SOCIAL_ICONS } from "../ui/socialIcons";
import { Container } from "./Container";
import styles from "./Footer.module.css";
import { NAV_LINKS } from "./Header";

export function Footer() {
  const { profile } = useContent().content;
  return (
    <footer className={styles.footer}>
      <Container className={styles.grid}>
        <div className={styles.brand}>
          <p className={styles.name}>{profile.name}</p>
          <p className={styles.role}>{profile.role}</p>
          <p className={styles.tagline}>{profile.tagline}</p>
        </div>

        <nav aria-label="Footer" className={styles.column}>
          <p className={`mono ${styles.heading}`}>pages</p>
          <ul className={styles.links}>
            <li>
              <TransitionLink to="/">Home</TransitionLink>
            </li>
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <TransitionLink to={link.to}>{link.label}</TransitionLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.column}>
          <p className={`mono ${styles.heading}`}>elsewhere</p>
          <ul className={styles.links} aria-label="Social profiles">
            {profile.socials.map((social) => (
              <li key={social.href}>
                <a href={social.href} target="_blank" rel="noopener noreferrer">
                  <Icon name={SOCIAL_ICONS[social.kind]} size={18} />
                  {social.label}
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${profile.email}`}>
                <Icon name="mail" size={18} />
                Email
              </a>
            </li>
          </ul>
        </div>
      </Container>

      <Container className={`mono ${styles.base}`}>
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <span>{profile.location.toLowerCase()} · utc+5:45</span>
      </Container>
    </footer>
  );
}
