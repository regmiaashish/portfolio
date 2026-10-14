import { Container } from "../components/layout/Container";
import { PageHeader } from "../components/layout/PageHeader";
import { PitchPanel } from "../components/sections/PitchPanel";
import { usePageMeta } from "../hooks/usePageMeta";
import styles from "./Page.module.css";

export function PitchPage() {
  usePageMeta({
    title: "Pitch Me",
    description:
      "A live multi-agent demo: name a company and a role, and three AI agents research it, match it to Aashish's work and write a short pitch.",
  });
  return (
    <>
      <PageHeader
        path="~/pitch"
        title="Pitch Me"
        intro="Name a company and a role. Three AI agents research it, match it to my real projects and write you a short pitch, streamed live."
      />
      <Container className={styles.pageBody}>
        <PitchPanel />
      </Container>
    </>
  );
}
