import { Link } from "react-router";

import { projects } from "../../data/projects";
import { Section } from "../layout/Section";
import { Grid } from "../layout/Stack";
import { ChipList } from "../ui/Chip";
import styles from "./Work.module.css";

export function Work() {
  return (
    <Section
      id="work"
      title="Selected work"
      intro="Production backends and AI integrations, plus a few things I built to learn."
    >
      <Grid as="ul" minColumn="19rem" className={styles.list}>
        {projects.map((project) => (
          <li key={project.slug}>
            <article className={styles.card}>
              {project.image && (
                <img
                  className={styles.image}
                  src={project.image.src}
                  alt={project.image.alt}
                  width={project.image.width}
                  height={project.image.height}
                  loading="lazy"
                  decoding="async"
                />
              )}
              <p className={styles.category}>{project.category}</p>
              <h3 className={styles.title}>
                <Link to={`/work/${project.slug}`}>{project.name}</Link>
              </h3>
              <p className={styles.summary}>{project.summary}</p>
              <div className={styles.stack}>
                <ChipList items={project.stack} label={`${project.name} stack`} />
              </div>
            </article>
          </li>
        ))}
      </Grid>
    </Section>
  );
}
