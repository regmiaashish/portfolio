import type { Project } from "./cmsContracts";

export interface StackOption {
  name: string;
  /** How many projects use it (real, from content). */
  count: number;
}

/** Every technology used across the projects, most used first, then alphabetical. */
export function stackOptions(projects: Project[]): StackOption[] {
  const counts = new Map<string, number>();
  for (const project of projects) {
    for (const tech of new Set(project.stack)) counts.set(tech, (counts.get(tech) ?? 0) + 1);
  }
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Projects using any of the selected technologies; everything when nothing is selected. */
export function filterProjects(projects: Project[], selected: readonly string[]): Project[] {
  if (selected.length === 0) return projects;
  const wanted = new Set(selected);
  return projects.filter((project) => project.stack.some((tech) => wanted.has(tech)));
}

/** The `?stack=` values from the URL, de-duplicated, in the order they appear. */
export function selectedStack(params: URLSearchParams): string[] {
  return [...new Set(params.getAll("stack").map((value) => value.trim()).filter(Boolean))];
}

/** A copy of the params with `tech` toggled in the `stack` list (other params kept). */
export function toggleStack(params: URLSearchParams, tech: string): URLSearchParams {
  const current = selectedStack(params);
  const next = current.includes(tech) ? current.filter((name) => name !== tech) : [...current, tech];
  const result = new URLSearchParams(params);
  result.delete("stack");
  for (const name of next) result.append("stack", name);
  return result;
}

/** Real, content-derived numbers for the /work header readouts. */
export function workStats(projects: Project[]) {
  return {
    projects: projects.length,
    caseStudies: projects.filter((project) => project.case_study).length,
    openSource: projects.filter((project) => project.repo_url).length,
    technologies: stackOptions(projects).length,
  };
}

/** A previous/next pair for a project, wrapping around the published list. */
export function neighbours(
  projects: Project[],
  slug: string,
): { previous: Project; next: Project } | null {
  const index = projects.findIndex((project) => project.slug === slug);
  if (index === -1 || projects.length < 2) return null;
  return {
    previous: projects[(index - 1 + projects.length) % projects.length],
    next: projects[(index + 1) % projects.length],
  };
}
