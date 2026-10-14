import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { Panel } from "../components/console/Panel";
import { Readout, ReadoutList } from "../components/console/Readout";
import { Container } from "../components/layout/Container";
import { PageHeader } from "../components/layout/PageHeader";
import { ProjectGrid } from "../components/sections/ProjectGrid";
import { StackFilter } from "../components/sections/StackFilter";
import { Button } from "../components/ui/Button";
import { useContent } from "../hooks/useContent";
import { usePageMeta } from "../hooks/usePageMeta";
import {
  filterProjects,
  selectedStack,
  stackOptions,
  toggleStack,
  workStats,
} from "../lib/workFilters";
import styles from "./Page.module.css";
import workStyles from "./WorkPage.module.css";

export function WorkPage() {
  const { projects, profile } = useContent().content;
  usePageMeta({
    title: "Work",
    description: `Projects by ${profile.name}: production backends, AI integrations and things built to learn.`,
  });

  // Filters live in the URL (?stack=FastAPI&stack=Docker) so a filtered view can be shared.
  const [params, setParams] = useSearchParams();
  const selected = selectedStack(params);
  const options = useMemo(() => stackOptions(projects), [projects]);
  const stats = useMemo(() => workStats(projects), [projects]);
  const visible = filterProjects(projects, selected);

  // replace: toggling filters shouldn't fill the Back button's history.
  const toggle = (tech: string) => setParams(toggleStack(params, tech), { replace: true });
  const clear = () => {
    const next = new URLSearchParams(params);
    next.delete("stack");
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader
        path="~/work"
        title="Work"
        intro="Production backends and AI integrations, plus a few things I built to learn. Open any project for the full case study."
      >
        <ReadoutList className={workStyles.readouts} aria-label="Work at a glance" minColumn="8rem">
          <Readout label="projects">{stats.projects}</Readout>
          <Readout label="case studies">{stats.caseStudies}</Readout>
          <Readout label="open source">{stats.openSource}</Readout>
          <Readout label="technologies">{stats.technologies}</Readout>
        </ReadoutList>
      </PageHeader>
      <Container className={styles.pageBody}>
        <div className={workStyles.toolbar}>
          <StackFilter options={options} selected={selected} onToggle={toggle} onClear={clear} />
          <p className={`mono ${workStyles.result}`} role="status">
            {selected.length === 0
              ? `showing all ${projects.length} projects`
              : `showing ${visible.length} of ${projects.length} projects`}
          </p>
        </div>

        {visible.length > 0 ? (
          <ProjectGrid projects={visible} headingLevel={2} label="All projects" prioritizeFirst />
        ) : (
          <Panel
            as="section"
            title="query.result"
            className={workStyles.empty}
            bodyClassName={workStyles.emptyBody}
            aria-labelledby="work-empty-heading"
          >
            <h2 id="work-empty-heading">No projects match</h2>
            <p>
              Nothing here uses {selected.join(" or ")}. Clear the filters to see every project.
            </p>
            <Button variant="secondary" onClick={clear}>
              Clear filters
            </Button>
          </Panel>
        )}
      </Container>
    </>
  );
}
