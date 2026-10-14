import { describe, expect, it } from "vitest";

import type { ProjectInput } from "../lib/cmsContracts";
import {
  DEFAULT_MAX_UPLOAD_BYTES,
  slugify,
  validateCareer,
  validateProfile,
  validateProject,
  validateSkillGroup,
  validateImageFile,
  safeFilename,
} from "./validation";
import { profile } from "../data/profile";

const PROJECT: ProjectInput = {
  slug: "my-project",
  name: "My project",
  category: "Web app",
  summary: "Does a thing.",
  stack: ["FastAPI"],
  repo_url: null,
  demo_url: null,
  image: null,
  case_study: null,
  published: true,
};

describe("validateProject", () => {
  it("accepts a valid project", () => {
    expect(validateProject(PROJECT)).toEqual({});
  });

  it.each(["My Project", "my--project", "-my", "my_project", "ünïcode", "a".repeat(61), ""])(
    "rejects the slug %j",
    (slug) => {
      expect(validateProject({ ...PROJECT, slug }).slug).toBeDefined();
    },
  );

  it("rejects non-http links and overlong links", () => {
    expect(validateProject({ ...PROJECT, repo_url: "javascript:alert(1)" }).repo_url).toBeDefined();
    expect(validateProject({ ...PROJECT, demo_url: `https://x.io/${"a".repeat(300)}` }).demo_url).toBeDefined();
    expect(validateProject({ ...PROJECT, repo_url: "https://github.com/x/y" })).toEqual({});
  });

  it("enforces text limits", () => {
    const errors = validateProject({
      ...PROJECT,
      name: "n".repeat(101),
      category: "c".repeat(61),
      summary: "s".repeat(301),
    });
    expect(Object.keys(errors).sort()).toEqual(["category", "name", "summary"]);
  });

  it("limits the stack to 15 items of 1–30 characters", () => {
    expect(validateProject({ ...PROJECT, stack: Array(16).fill("x") }).stack).toBeDefined();
    expect(validateProject({ ...PROJECT, stack: ["x".repeat(31)] })["stack.0"]).toBeDefined();
  });

  it("requires alt text and a readable size for images", () => {
    const errors = validateProject({
      ...PROJECT,
      image: { key: "portfolio/projects/a.png", alt: " ", width: 0, height: 20000 },
    });
    expect(errors["image.alt"]).toBeDefined();
    expect(errors["image.width"]).toBeDefined();
    expect(errors["image.height"]).toBeDefined();
  });

  it("validates the case study", () => {
    const errors = validateProject({
      ...PROJECT,
      case_study: { problem: "", role: "r", decisions: [], result: "x".repeat(2001) },
    });
    expect(errors["case_study.problem"]).toBeDefined();
    expect(errors["case_study.decisions"]).toBeDefined();
    expect(errors["case_study.result"]).toBeDefined();
    expect(
      validateProject({
        ...PROJECT,
        case_study: { problem: "p", role: "r", decisions: Array(9).fill("d"), result: "x" },
      })["case_study.decisions"],
    ).toBeDefined();
  });
});

describe("validateProfile", () => {
  it("accepts the bundled profile", () => {
    expect(validateProfile(profile)).toEqual({});
  });

  it("checks email, phone link and socials", () => {
    const errors = validateProfile({
      ...profile,
      email: "not-an-email",
      phone: { display: "+977", href: "9800000000" },
      socials: [
        ...profile.socials,
        { kind: "website", label: "", href: "ftp://example.com" },
      ],
    });
    expect(errors.email).toBeDefined();
    expect(errors["phone.href"]).toBeDefined();
    expect(errors["socials.3.label"]).toBeDefined();
    expect(errors["socials.3.href"]).toBeDefined();
  });

  it("allows no phone and limits socials to 8", () => {
    expect(validateProfile({ ...profile, phone: null })).toEqual({});
    const many = Array.from({ length: 9 }, () => profile.socials[0]);
    expect(validateProfile({ ...profile, socials: many }).socials).toBeDefined();
  });
});

describe("career and skills", () => {
  it("enforce their limits", () => {
    expect(
      Object.keys(validateCareer({ role: "", company: "c", period: "p".repeat(21), summary: "s" })).sort(),
    ).toEqual(["period", "role"]);
    expect(validateSkillGroup({ title: "T", description: "D", skills: [] }).skills).toBeDefined();
    expect(validateSkillGroup({ title: "T", description: "D", skills: Array(21).fill("x") }).skills).toBeDefined();
    expect(validateSkillGroup({ title: "T", description: "D", skills: ["Python"] })).toEqual({});
  });
});

describe("slugify", () => {
  it("makes URL-safe slugs", () => {
    expect(slugify("Gains Garage: Backend!")).toBe("gains-garage-backend");
    expect(slugify("  Zürich   Bank  ")).toBe("zurich-bank");
    expect(slugify("x".repeat(80))).toHaveLength(60);
  });
});

describe("validateImageFile", () => {
  it("accepts allowed image types within the size limit", () => {
    expect(validateImageFile({ type: "image/webp", size: 1000 })).toBeNull();
  });

  it("rejects other types and oversize files", () => {
    expect(validateImageFile({ type: "image/svg+xml", size: 10 })).toMatch(/PNG, JPEG/);
    expect(validateImageFile({ type: "image/png", size: DEFAULT_MAX_UPLOAD_BYTES + 1 })).toMatch(/5 MB/);
  });
});

describe("safeFilename", () => {
  it("keeps short names and trims long ones to 200 characters with the extension", () => {
    expect(safeFilename("shot.png")).toBe("shot.png");
    const long = safeFilename(`${"a".repeat(300)}.webp`);
    expect(long).toHaveLength(200);
    expect(long.endsWith(".webp")).toBe(true);
  });
});

it("rejects a phone link longer than 60 characters", () => {
  expect(
    validateProfile({ ...profile, phone: { display: "x", href: `tel:${"1".repeat(60)}` } })["phone.href"],
  ).toBeDefined();
});
