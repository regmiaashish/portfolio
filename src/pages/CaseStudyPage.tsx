import { useParams } from "react-router";

import { Panel } from "../components/console/Panel";
import { Readout, ReadoutList } from "../components/console/Readout";
import { StatusLight } from "../components/console/StatusLight";
import { Container } from "../components/layout/Container";
import { Stack } from "../components/layout/Stack";
import { TransitionLink } from "../components/motion/TransitionLink";
import { ButtonAnchor } from "../components/ui/Button";
import { ChipList } from "../components/ui/Chip";
import { findProject, useContent } from "../hooks/useContent";
import { usePageMeta } from "../hooks/usePageMeta";
import type { Project } from "../lib/cmsContracts";
import { projectMediaTransition, projectTitleTransition } from "../lib/viewTransitions";
import { neighbours } from "../lib/workFilters";
import styles from "./CaseStudyPage.module.css";
import { NotFoundPage } from "./NotFoundPage";

const SECTIONS = [
  { id: "problem", label: "problem", heading: "The problem" },
  { id: "role", label: "role", heading: "My role" },
  { id: "decisions", label: "decisions", heading: "Key decisions" },
  { id: "result", label: "result", heading: "Result" },
] as const;

function fileName(url: string): string {
  return url.split("/").pop()?.split("?")[0] || "screenshot";
}

function ProjectMedia({ project }: { project: Project }) {
  if (project.image) {
    return (
      <Panel title={`media/${fileName(project.image.url)}`} flush className={styles.frame}>
        <img
          className={styles.image}
          style={projectMediaTransition(project.slug)}
          src={project.image.url}
          alt={project.image.alt}
          width={project.image.width}
          height={project.image.height}
          sizes="(min-width: 72rem) 68rem, 100vw"
          decoding="async"
        />
      </Panel>
    );
  }
  // No screenshot yet: the same decorative cover as the project card, at hero scale.
  return (
    <div className={styles.cover} aria-hidden="true" style={projectMediaTransition(project.slug)}>
      <span className={styles.monogram}>{project.name.trim().charAt(0)}</span>
    </div>
  );
}

function CaseStudy({ project }: { project: Project }) {
  const study = project.case_study;
  if (!study) {
    return (
      <Panel
        as="section"
        title="case-study.md"
        status={<StatusLight status="running" label="being written" />}
        className={styles.pending}
        bodyClassName={styles.pendingBody}
        aria-labelledby="case-study-pending"
      >
        <h2 id="case-study-pending">Case study in progress</h2>
        <p>
          The full write-up is being written. Until then, the summary and stack above describe the
          project.
        </p>
        <ul className={`mono ${styles.checklist}`} aria-label="What the case study will cover">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <span aria-hidden="true">[ ] </span>
              {section.heading.toLowerCase()}
            </li>
          ))}
        </ul>
      </Panel>
    );
  }

  return (
    <div className={styles.story}>
      <nav className={styles.toc} aria-labelledby="case-study-toc">
        <p id="case-study-toc" className={`mono ${styles.tocLabel}`}>
          contents
        </p>
        <ol className={styles.tocList}>
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.label}</a>
            </li>
          ))}
        </ol>
      </nav>

      <div className={styles.sections}>
        <section id="problem" className={styles.section} aria-labelledby="problem-heading">
          <p className={`mono ${styles.sectionLabel}`} aria-hidden="true">
            ## problem
          </p>
          <h2 id="problem-heading">The problem</h2>
          <p>{study.problem}</p>
        </section>
        <section id="role" className={styles.section} aria-labelledby="role-heading">
          <p className={`mono ${styles.sectionLabel}`} aria-hidden="true">
            ## role
          </p>
          <h2 id="role-heading">My role</h2>
          <p>{study.role}</p>
        </section>
        <section id="decisions" className={styles.section} aria-labelledby="decisions-heading">
          <p className={`mono ${styles.sectionLabel}`} aria-hidden="true">
            ## decisions
          </p>
          <h2 id="decisions-heading">Key decisions</h2>
          <ol className={styles.decisions}>
            {study.decisions.map((decision) => (
              <li key={decision}>{decision}</li>
            ))}
          </ol>
        </section>
        <Panel
          as="section"
          id="result"
          title="## result"
          className={styles.section}
          aria-labelledby="result-heading"
        >
          <h2 id="result-heading">Result</h2>
          <p className={styles.resultBody}>{study.result}</p>
        </Panel>
      </div>
    </div>
  );
}

export function CaseStudyPage() {
  const { slug } = useParams();
  const { content } = useContent();
  const project = findProject(content, slug);
  usePageMeta({ title: project?.name ?? "Project not found", description: project?.summary });

  if (!project) return <NotFoundPage />;

  const pager = neighbours(content.projects, project.slug);
  const hasLinks = Boolean(project.repo_url || project.demo_url);

  return (
    <article className={styles.page}>
      <Container>
        <TransitionLink to="/work" className={styles.back}>
          <span aria-hidden="true">←&nbsp;</span>All work
        </TransitionLink>

        <div className={styles.header}>
          <div>
            <p className={`mono ${styles.path}`} aria-hidden="true">
              $ cat ~/work/{project.slug}/README.md
            </p>
            <h1 className={styles.title} style={projectTitleTransition(project.slug)}>
              {project.name}
            </h1>
            <p className={styles.category}>{project.category}</p>
            <p className={styles.lead}>{project.summary}</p>
            {hasLinks && (
              <Stack direction="row" gap={3} className={styles.links}>
                {project.repo_url && (
                  <ButtonAnchor href={project.repo_url} target="_blank" rel="noopener noreferrer">
                    Source code<span className="visually-hidden"> (opens in a new tab)</span>
                  </ButtonAnchor>
                )}
                {project.demo_url && (
                  <ButtonAnchor href={project.demo_url} target="_blank" rel="noopener noreferrer">
                    Live demo<span className="visually-hidden"> (opens in a new tab)</span>
                  </ButtonAnchor>
                )}
              </Stack>
            )}
          </div>

          <Panel
            as="aside"
            title="project.meta"
            bodyClassName={styles.metaBody}
            aria-labelledby="project-meta-heading"
          >
            <h2 id="project-meta-heading" className="visually-hidden">
              Project details
            </h2>
            <ReadoutList minColumn="7.5rem">
              <Readout label="technologies">{project.stack.length}</Readout>
              <Readout label="source">{project.repo_url ? "public" : "not public"}</Readout>
              <Readout label="demo">{project.demo_url ? "live" : "none"}</Readout>
              <Readout label="case study">{project.case_study ? "written" : "in progress"}</Readout>
            </ReadoutList>
            <ChipList items={project.stack} label={`${project.name} stack`} />
          </Panel>
        </div>

        <div className={styles.media}>
          <ProjectMedia project={project} />
        </div>

        <CaseStudy project={project} />

        {pager && (
          <nav className={styles.pager} aria-label="More projects">
            <TransitionLink to={`/work/${pager.previous.slug}`} className={styles.pagerLink}>
              <span className={`mono ${styles.pagerLabel}`}>
                <span aria-hidden="true">← </span>previous
              </span>
              <span className={styles.pagerName}>{pager.previous.name}</span>
            </TransitionLink>
            <TransitionLink
              to={`/work/${pager.next.slug}`}
              className={`${styles.pagerLink} ${styles.pagerNext}`}
            >
              <span className={`mono ${styles.pagerLabel}`}>
                next<span aria-hidden="true"> →</span>
              </span>
              <span className={styles.pagerName}>{pager.next.name}</span>
            </TransitionLink>
          </nav>
        )}
      </Container>
    </article>
  );
}
