import { Container } from "../components/layout/Container";
import { ButtonLink } from "../components/ui/Button";
import { usePageMeta } from "../hooks/usePageMeta";
import styles from "./Page.module.css";

export function NotFoundPage() {
  usePageMeta({ title: "Page not found", robots: "noindex" });
  return (
    <div className={styles.page}>
      <Container>
        <h1>Page not found</h1>
        <p className={styles.lead}>That page doesn't exist, or it has moved.</p>
        <div className={styles.body}>
          <ButtonLink variant="primary" to="/">
            Go to the home page
          </ButtonLink>
        </div>
      </Container>
    </div>
  );
}
