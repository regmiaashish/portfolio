import { Navigate, useLocation } from "react-router";

import { Section } from "../components/layout/Section";
import { TransitionLink } from "../components/motion/TransitionLink";
import { AboutTeaser } from "../components/sections/AboutTeaser";
import { ContactBand } from "../components/sections/ContactBand";
import { Hero } from "../components/sections/Hero";
import { ProjectGrid } from "../components/sections/ProjectGrid";
import { useContent } from "../hooks/useContent";
import { usePageMeta } from "../hooks/usePageMeta";
import styles from "./Page.module.css";

/** Old single-page anchors now live on their own pages. */
const LEGACY_ANCHORS: Record<string, string> = {
  "#work": "/work",
  "#pitch": "/pitch",
  "#contact": "/contact",
  "#about": "/about",
  "#career": "/about",
  "#stack": "/about",
};

const FEATURED_COUNT = 3;

export function HomePage() {
  usePageMeta();
  const { hash } = useLocation();
  const { projects } = useContent().content;

  const legacyTarget = LEGACY_ANCHORS[hash];
  if (legacyTarget) return <Navigate to={legacyTarget} replace />;

  return (
    <>
      <Hero />
      <Section
        id="featured"
        label="~/work"
        title="Selected work"
        intro="Production backends and AI integrations."
        action={
          <TransitionLink to="/work" className={styles.sectionLink}>
            All {projects.length} projects
          </TransitionLink>
        }
      >
        <ProjectGrid projects={projects.slice(0, FEATURED_COUNT)} label="Featured projects" />
      </Section>
      <AboutTeaser />
      <ContactBand />
    </>
  );
}
