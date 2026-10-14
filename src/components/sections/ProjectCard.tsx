import type { Project } from "../../lib/cmsContracts";
import { projectMediaTransition, projectTitleTransition } from "../../lib/viewTransitions";
import { TransitionLink } from "../motion/TransitionLink";
import { ChipList } from "../ui/Chip";
import styles from "./ProjectCard.module.css";

interface ProjectCardProps {
  project: Project;
  /** h2 on pages where the card list is the main content, h3 inside a titled section. */
  headingLevel?: 2 | 3;
  /** Load the image straight away (the first card on /work is the largest thing on screen). */
  eager?: boolean;
}

/** A project as a window onto the system: path bar, optional screenshot, summary and stack. */
export function ProjectCard({ project, headingLevel = 3, eager = false }: ProjectCardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className={styles.card}>
      <div className={`mono ${styles.bar}`}>
        <span className={styles.path}>~/work/{project.slug}</span>
        <span className={styles.category}>{project.category}</span>
      </div>
      {!project.image && (
        // No screenshot yet: a decorative cover built from the project's own data.
        <div className={styles.cover} aria-hidden="true" style={projectMediaTransition(project.slug)}>
          <span className={styles.monogram}>{project.name.trim().charAt(0)}</span>
        </div>
      )}
      {project.image && (
        <img
          className={styles.image}
          style={projectMediaTransition(project.slug)}
          src={project.image.url}
          alt={project.image.alt}
          width={project.image.width}
          height={project.image.height}
          // ~22rem in the 3-column grid, half the width on tablets, full on phones.
          sizes="(min-width: 72rem) 22rem, (min-width: 40rem) 45vw, 100vw"
          loading={eager ? "eager" : "lazy"}
          // React 18 only forwards the lowercase HTML attribute (camelCase warns), and its
          // types don't list it, so it goes in via a spread.
          {...{ fetchpriority: eager ? "high" : "auto" }}
          decoding="async"
        />
      )}
      <div className={styles.body}>
        <Heading className={styles.title} style={projectTitleTransition(project.slug)}>
          <TransitionLink to={`/work/${project.slug}`}>{project.name}</TransitionLink>
        </Heading>
        <p className={styles.summary}>{project.summary}</p>
        <div className={styles.footer}>
          <ChipList items={project.stack} label={`${project.name} stack`} />
          <span className={`mono ${styles.open}`} aria-hidden="true">
            open case study <span className={styles.arrow}>→</span>
          </span>
        </div>
      </div>
    </article>
  );
}
