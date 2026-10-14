import { describe, expect, it } from "vitest";

import { projects } from "../data/projects";
import { projectMediaTransition, projectTitleTransition } from "./viewTransitions";
import {
  filterProjects,
  neighbours,
  selectedStack,
  stackOptions,
  toggleStack,
  workStats,
} from "./workFilters";

describe("stackOptions", () => {
  it("counts each technology once per project, most used first", () => {
    const options = stackOptions(projects);

    expect(options[0]).toEqual({ name: "Python", count: 4 });
    expect(options.find((option) => option.name === "Django")).toEqual({ name: "Django", count: 1 });
    const counts = options.map((option) => option.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });
});

describe("filterProjects", () => {
  it("returns everything with no selection", () => {
    expect(filterProjects(projects, [])).toHaveLength(projects.length);
  });

  it("keeps projects using any of the selected technologies", () => {
    const names = filterProjects(projects, ["Django", "Twilio"]).map((project) => project.slug);

    expect(names).toEqual(["fagoon-upgrade", "alliance", "cricket-management-system"]);
  });

  it("returns nothing for an unknown technology", () => {
    expect(filterProjects(projects, ["Rust"])).toEqual([]);
  });
});

describe("URL helpers", () => {
  it("reads and de-duplicates ?stack= values", () => {
    expect(selectedStack(new URLSearchParams("stack=Django&stack=%20Django%20&stack=&stack=Go"))).toEqual([
      "Django",
      "Go",
    ]);
  });

  it("toggles a technology on and off, keeping other params", () => {
    const on = toggleStack(new URLSearchParams("page=2&stack=Go"), "Django");
    expect(on.toString()).toBe("page=2&stack=Go&stack=Django");

    const off = toggleStack(on, "Go");
    expect(off.toString()).toBe("page=2&stack=Django");
  });
});

describe("workStats", () => {
  it("derives every number from the content", () => {
    expect(workStats(projects)).toEqual({
      projects: 5,
      caseStudies: 0,
      openSource: 2,
      technologies: stackOptions(projects).length,
    });
  });
});

describe("neighbours", () => {
  it("returns the previous and next project", () => {
    const pair = neighbours(projects, "jarvis");

    expect(pair?.previous.slug).toBe("alliance");
    expect(pair?.next.slug).toBe("cricket-management-system");
  });

  it("wraps around at both ends", () => {
    expect(neighbours(projects, "fagoon-upgrade")?.previous.slug).toBe("cricket-management-system");
    expect(neighbours(projects, "cricket-management-system")?.next.slug).toBe("fagoon-upgrade");
  });

  it("returns null for an unknown slug or a single project", () => {
    expect(neighbours(projects, "nope")).toBeNull();
    expect(neighbours(projects.slice(0, 1), "fagoon-upgrade")).toBeNull();
  });
});

describe("view transition names", () => {
  it("share one name per project between card and case study", () => {
    expect(projectTitleTransition("fagoon-upgrade")).toEqual({
      viewTransitionName: "project-title-fagoon-upgrade",
    });
    expect(projectMediaTransition("Odd Slug!")).toEqual({
      viewTransitionName: "project-media-odd-slug-",
    });
  });
});
