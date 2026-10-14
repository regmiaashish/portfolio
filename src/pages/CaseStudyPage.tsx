import { Link, useParams } from "react-router";

import { Container } from "../components/layout/Container";
import { Stack } from "../components/layout/Stack";
import { ButtonAnchor } from "../components/ui/Button";
import { ChipList } from "../components/ui/Chip";
import { findProject } from "../data/projects";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { NotFoundPage } from "./NotFoundPage";
import styles from "./Page.module.css";

export function CaseStudyPage() {
  const { slug } = useParams();
  const project = findProject(slug);
  useDocumentTitle(project?.name ?? "Project not found");

  if (!project) return <NotFoundPage />;

  return (
    <article className={styles.page}>
      <Container>
        <Link to="/#work" className={styles.back}>
          Back to all work
        </Link>
        <h1>{project.name}</h1>
        <p className={styles.meta}>{project.category}</p>
        <p className={styles.lead}>{project.summary}</p>

        <Stack gap={5} className={styles.body}>
          <ChipList items={project.stack} label={`${project.name} stack`} />
          {(project.repoUrl || project.demoUrl) && (
            <Stack direction="row" gap={3}>
              {project.repoUrl && (
                <ButtonAnchor href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                  Source code<span className="visually-hidden"> (opens in a new tab)</span>
                </ButtonAnchor>
              )}
              {project.demoUrl && (
                <ButtonAnchor href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                  Live demo<span className="visually-hidden"> (opens in a new tab)</span>
                </ButtonAnchor>
              )}
            </Stack>
          )}
        </Stack>

        {project.image && (
          <img
            className={styles.image}
            src={project.image.src}
            alt={project.image.alt}
            width={project.image.width}
            height={project.image.height}
          />
        )}

        {project.caseStudy ? (
          <Stack gap={5} className={styles.body}>
            <section>
              <h2>The problem</h2>
              <p>{project.caseStudy.problem}</p>
            </section>
            <section>
              <h2>My role</h2>
              <p>{project.caseStudy.role}</p>
            </section>
            <section>
              <h2>Key decisions</h2>
              <ul>
                {project.caseStudy.decisions.map((decision) => (
                  <li key={decision}>{decision}</li>
                ))}
              </ul>
            </section>
            <section>
              <h2>Result</h2>
              <p>{project.caseStudy.result}</p>
            </section>
          </Stack>
        ) : (
          <p className={styles.notice}>
            The full case study (the problem, my role, the hard decisions and the result) is being
            written.
          </p>
        )}
      </Container>
    </article>
  );
}
