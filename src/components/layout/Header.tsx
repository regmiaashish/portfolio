import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

import { useContent } from "../../hooks/useContent";
import { useTheme } from "../../hooks/useTheme";
import { TransitionLink, TransitionNavLink } from "../motion/TransitionLink";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Container } from "./Container";
import styles from "./Header.module.css";

export const NAV_LINKS = [
  { label: "Work", to: "/work" },
  { label: "Pitch", to: "/pitch" },
  { label: "About", to: "/about" },
  { label: "Résumé", to: "/resume" },
  { label: "Contact", to: "/contact" },
] as const;

export function Header() {
  const { profile } = useContent().content;
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  // Close the mobile menu whenever the route or hash changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <header className={styles.header}>
      <Container className={styles.bar}>
        <TransitionLink to="/" className={styles.brand} aria-label={`${profile.name}, home`}>
          <span className={styles.prompt} aria-hidden="true">
            ~/
          </span>
          {profile.name}
          <span className={styles.cursor} aria-hidden="true" />
        </TransitionLink>

        <div className={styles.actions}>
          <nav id="site-nav" aria-label="Main" className={styles.nav} data-open={menuOpen}>
            <ul>
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <TransitionNavLink
                    to={link.to}
                    className={styles.navLink}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </TransitionNavLink>
                </li>
              ))}
            </ul>
          </nav>

          <Button
            variant="ghost"
            iconOnly
            onClick={toggleTheme}
            aria-label={`Switch to ${nextTheme} theme`}
            title={`Switch to ${nextTheme} theme`}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </Button>

          <Button
            ref={menuButtonRef}
            variant="ghost"
            iconOnly
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </Button>
        </div>
      </Container>
    </header>
  );
}
