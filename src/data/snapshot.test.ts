import { describe, expect, it } from "vitest";

import {
  validateCareer,
  validateProfile,
  validateProject,
  validateSkillGroup,
} from "../admin/validation";
import { isSiteContent } from "../hooks/useContent";
import { contentSnapshot } from "./snapshot";

describe("bundled content snapshot", () => {
  it("has the public content shape", () => {
    expect(isSiteContent(contentSnapshot)).toBe(true);
  });

  it("would pass the admin (and server) validation rules", () => {
    expect(validateProfile(contentSnapshot.profile)).toEqual({});
    for (const project of contentSnapshot.projects) {
      const { image } = project;
      const input = {
        slug: project.slug,
        name: project.name,
        category: project.category,
        summary: project.summary,
        stack: project.stack,
        repo_url: project.repo_url,
        demo_url: project.demo_url,
        case_study: project.case_study,
        image: image
          ? { key: "portfolio/snapshot", alt: image.alt, width: image.width, height: image.height }
          : null,
        published: true,
      };
      expect(validateProject(input), project.slug).toEqual({});
    }
    for (const entry of contentSnapshot.career) expect(validateCareer(entry)).toEqual({});
    for (const group of contentSnapshot.skills) expect(validateSkillGroup(group)).toEqual({});
  });

  it("uses unique slugs and ids", () => {
    const slugs = contentSnapshot.projects.map((project) => project.slug);
    const ids = [
      ...contentSnapshot.projects,
      ...contentSnapshot.career,
      ...contentSnapshot.skills,
    ].map((item) => item.id);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
