import type { Project } from "../../lib/cmsContracts";
import { Grid } from "../layout/Stack";
import { Reveal } from "../motion/Reveal";
import { ProjectCard } from "./ProjectCard";

interface ProjectGridProps {
  projects: Project[];
  headingLevel?: 2 | 3;
  label?: string;
  /** The grid is the first content on the page: load the first image eagerly. */
  prioritizeFirst?: boolean;
}

/** Project cards in a responsive grid, revealed with a short stagger as they scroll in. */
export function ProjectGrid({
  projects,
  headingLevel = 3,
  label = "Projects",
  prioritizeFirst = false,
}: ProjectGridProps) {
  return (
    <Grid as="ul" minColumn="19rem" gap={5} aria-label={label} style={{ padding: 0, listStyle: "none" }}>
      {projects.map((project, index) => (
        <Reveal as="li" key={project.slug} delayMs={Math.min(index, 5) * 70}>
          <ProjectCard project={project} headingLevel={headingLevel} eager={prioritizeFirst && index === 0} />
        </Reveal>
      ))}
    </Grid>
  );
}
