/**
 * Client-side validation. Mirrors the limits in the backend contract
 * (docs/ADMIN_CMS_CONTRACT.md, "Validation"); the server enforces the same rules.
 *
 * Errors are keyed by field path ("slug", "case_study.problem", "socials.2.href"), the same
 * paths the server reports in a 422's `errors[].loc`.
 */
import {
  type CareerInput,
  type Profile,
  type ProjectInput,
  SOCIAL_KINDS,
  type SkillGroupInput,
} from "../lib/cmsContracts";

export type FieldErrors = Record<string, string>;

export const LIMITS = {
  slug: 60,
  name: 100,
  role: 100,
  company: 100,
  location: 60,
  category: 60,
  skillTitle: 60,
  tagline: 160,
  profileSummary: 800,
  projectSummary: 300,
  skillDescription: 300,
  careerSummary: 600,
  period: 20,
  stackItems: 15,
  skillItems: 20,
  chip: 30,
  url: 300,
  socials: 8,
  socialLabel: 30,
  phoneDisplay: 40,
  phoneHref: 60,
  filename: 200,
  caseStudyText: 2000,
  decisions: 8,
  decision: 300,
  imageAlt: 200,
  imageDimension: 10000,
} as const;

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"];
export const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

function checkText(
  errors: FieldErrors,
  key: string,
  value: string,
  max: number,
  label: string,
): void {
  const length = value.trim().length;
  if (length === 0) errors[key] = `${label} is required.`;
  else if (length > max) errors[key] = `${label} must be ${max} characters or fewer.`;
}

export function isHttpUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function checkUrl(
  errors: FieldErrors,
  key: string,
  value: string | null | undefined,
  label: string,
): void {
  if (value === null || value === undefined || value === "") return;
  if (value.length > LIMITS.url) errors[key] = `${label} must be ${LIMITS.url} characters or fewer.`;
  else if (!isHttpUrl(value)) errors[key] = `${label} must start with https:// or http://.`;
}

function checkChips(
  errors: FieldErrors,
  key: string,
  items: string[],
  { min, max, label }: { min: number; max: number; label: string },
): void {
  if (items.length < min) errors[key] = `Add at least ${min} ${label}.`;
  else if (items.length > max) errors[key] = `Use at most ${max} ${label}.`;
  items.forEach((item, index) => {
    const length = item.trim().length;
    if (length === 0 || length > LIMITS.chip) {
      errors[`${key}.${index}`] = `Each entry must be 1–${LIMITS.chip} characters.`;
      errors[key] ??= `Each entry must be 1–${LIMITS.chip} characters.`;
    }
  });
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LIMITS.slug)
    .replace(/-+$/g, "");
}

export function validateProfile(profile: Profile): FieldErrors {
  const errors: FieldErrors = {};
  checkText(errors, "name", profile.name, LIMITS.name, "Name");
  checkText(errors, "role", profile.role, LIMITS.role, "Role");
  checkText(errors, "location", profile.location, LIMITS.location, "Location");
  checkText(errors, "tagline", profile.tagline, LIMITS.tagline, "Tagline");
  checkText(errors, "summary", profile.summary, LIMITS.profileSummary, "Summary");
  if (!EMAIL_PATTERN.test(profile.email.trim())) errors.email = "Enter a valid email address.";

  if (profile.phone) {
    checkText(errors, "phone.display", profile.phone.display, LIMITS.phoneDisplay, "Phone number");
    const href = profile.phone.href.trim();
    if (!href.startsWith("tel:") || href.length < 5) {
      errors["phone.href"] = 'The phone link must start with "tel:", e.g. tel:+9779800000000.';
    } else if (href.length > LIMITS.phoneHref) {
      errors["phone.href"] = `The phone link must be ${LIMITS.phoneHref} characters or fewer.`;
    }
  }

  if (profile.socials.length > LIMITS.socials) {
    errors.socials = `Use at most ${LIMITS.socials} social links.`;
  }
  profile.socials.forEach((social, index) => {
    if (!SOCIAL_KINDS.includes(social.kind)) errors[`socials.${index}.kind`] = "Pick a type.";
    checkText(errors, `socials.${index}.label`, social.label, LIMITS.socialLabel, "Label");
    if (!social.href) errors[`socials.${index}.href`] = "Link is required.";
    else checkUrl(errors, `socials.${index}.href`, social.href, "Link");
  });
  return errors;
}

export function validateProject(input: ProjectInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.slug) errors.slug = "Slug is required.";
  else if (input.slug.length > LIMITS.slug) {
    errors.slug = `Slug must be ${LIMITS.slug} characters or fewer.`;
  } else if (!SLUG_PATTERN.test(input.slug)) {
    errors.slug = "Use lowercase letters, numbers and single hyphens, e.g. my-project.";
  }
  checkText(errors, "name", input.name, LIMITS.name, "Name");
  checkText(errors, "category", input.category, LIMITS.category, "Category");
  checkText(errors, "summary", input.summary, LIMITS.projectSummary, "Summary");
  checkChips(errors, "stack", input.stack, {
    min: 0,
    max: LIMITS.stackItems,
    label: "technologies",
  });
  checkUrl(errors, "repo_url", input.repo_url, "Source code link");
  checkUrl(errors, "demo_url", input.demo_url, "Demo link");

  if (input.image) {
    checkText(errors, "image.alt", input.image.alt, LIMITS.imageAlt, "Alt text");
    for (const dimension of ["width", "height"] as const) {
      const value = input.image[dimension];
      if (!Number.isInteger(value) || value < 1 || value > LIMITS.imageDimension) {
        errors[`image.${dimension}`] = "The image size couldn't be read. Upload it again.";
      }
    }
  }

  if (input.case_study) {
    const study = input.case_study;
    checkText(errors, "case_study.problem", study.problem, LIMITS.caseStudyText, "The problem");
    checkText(errors, "case_study.role", study.role, LIMITS.caseStudyText, "Your role");
    checkText(errors, "case_study.result", study.result, LIMITS.caseStudyText, "The result");
    if (study.decisions.length < 1) errors["case_study.decisions"] = "Add at least one decision.";
    else if (study.decisions.length > LIMITS.decisions) {
      errors["case_study.decisions"] = `Use at most ${LIMITS.decisions} decisions.`;
    }
    study.decisions.forEach((decision, index) => {
      checkText(errors, `case_study.decisions.${index}`, decision, LIMITS.decision, "Decision");
    });
  }
  return errors;
}

export function validateCareer(input: CareerInput): FieldErrors {
  const errors: FieldErrors = {};
  checkText(errors, "role", input.role, LIMITS.role, "Role");
  checkText(errors, "company", input.company, LIMITS.company, "Company");
  checkText(errors, "period", input.period, LIMITS.period, "Period");
  checkText(errors, "summary", input.summary, LIMITS.careerSummary, "Summary");
  return errors;
}

export function validateSkillGroup(input: SkillGroupInput): FieldErrors {
  const errors: FieldErrors = {};
  checkText(errors, "title", input.title, LIMITS.skillTitle, "Title");
  checkText(errors, "description", input.description, LIMITS.skillDescription, "Description");
  checkChips(errors, "skills", input.skills, { min: 1, max: LIMITS.skillItems, label: "skills" });
  return errors;
}

/** Shortens a file name to the server's limit, keeping the extension. */
export function safeFilename(name: string): string {
  if (name.length <= LIMITS.filename) return name;
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? name.slice(dot) : "";
  return name.slice(0, LIMITS.filename - extension.length) + extension;
}

/** Null when the file can be uploaded, otherwise the reason it can't. */
export function validateImageFile(
  file: Pick<File, "type" | "size">,
  maxBytes: number = DEFAULT_MAX_UPLOAD_BYTES,
): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Use a PNG, JPEG, WebP or AVIF image.";
  }
  if (file.size > maxBytes) {
    return `The image must be ${Math.floor(maxBytes / (1024 * 1024))} MB or smaller.`;
  }
  return null;
}
