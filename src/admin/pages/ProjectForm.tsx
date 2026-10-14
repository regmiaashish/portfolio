import { useState } from "react";
import { useNavigate, useParams } from "react-router";

import { Button } from "../../components/ui/Button";
import { Checkbox, Input, Textarea } from "../../components/ui/Field";
import type { AdminProject, ProjectInput } from "../../lib/cmsContracts";
import { useAdminContent } from "../adminContent";
import { adminApi } from "../api";
import styles from "../Admin.module.css";
import { ChipInput } from "../components/ChipInput";
import { GuardedLink } from "../components/GuardedLink";
import { ImageUpload, type UploadedImage } from "../components/ImageUpload";
import { LoadState } from "../components/LoadState";
import { TextListField } from "../components/TextListField";
import { useEntityForm } from "../useEntityForm";
import { LIMITS, slugify, validateProject } from "../validation";

interface ProjectValues {
  slug: string;
  name: string;
  category: string;
  summary: string;
  stack: string[];
  repo_url: string;
  demo_url: string;
  published: boolean;
  image: UploadedImage | null;
  image_alt: string;
  has_case_study: boolean;
  problem: string;
  role: string;
  decisions: string[];
  result: string;
}

function toValues(project?: AdminProject): ProjectValues {
  return {
    slug: project?.slug ?? "",
    name: project?.name ?? "",
    category: project?.category ?? "",
    summary: project?.summary ?? "",
    stack: project?.stack ?? [],
    repo_url: project?.repo_url ?? "",
    demo_url: project?.demo_url ?? "",
    published: project?.published ?? false,
    image: project?.image
      ? {
          key: project.image.key,
          url: project.image.url,
          width: project.image.width,
          height: project.image.height,
        }
      : null,
    image_alt: project?.image?.alt ?? "",
    has_case_study: Boolean(project?.case_study),
    problem: project?.case_study?.problem ?? "",
    role: project?.case_study?.role ?? "",
    decisions: project?.case_study?.decisions ?? [""],
    result: project?.case_study?.result ?? "",
  };
}

function toInput(values: ProjectValues): ProjectInput {
  return {
    slug: values.slug.trim(),
    name: values.name.trim(),
    category: values.category.trim(),
    summary: values.summary.trim(),
    stack: values.stack,
    repo_url: values.repo_url.trim() || null,
    demo_url: values.demo_url.trim() || null,
    image: values.image
      ? {
          key: values.image.key,
          alt: values.image_alt.trim(),
          width: values.image.width,
          height: values.image.height,
        }
      : null,
    case_study: values.has_case_study
      ? {
          problem: values.problem.trim(),
          role: values.role.trim(),
          decisions: values.decisions.map((decision) => decision.trim()),
          result: values.result.trim(),
        }
      : null,
    published: values.published,
  };
}

export function ProjectFormPage() {
  const { id } = useParams();
  const { status, content } = useAdminContent();
  if (status !== "ready" || !content) return <LoadState />;

  const project = id ? content.projects.find((item) => item.id === id) : undefined;
  if (id && !project) {
    return (
      <>
        <h1>Project not found</h1>
        <p>
          It may have been deleted. <GuardedLink to="/admin/projects">Back to projects</GuardedLink>
        </p>
      </>
    );
  }
  return <ProjectForm key={id ?? "new"} project={project} />;
}

function ProjectForm({ project }: { project?: AdminProject }) {
  const navigate = useNavigate();
  const { reload } = useAdminContent();
  const [slugTouched, setSlugTouched] = useState(Boolean(project));
  const form = useEntityForm({
    initial: toValues(project),
    toInput,
    validate: validateProject,
    save: async (input) => {
      if (project) await adminApi.updateProject(project.id, input);
      else await adminApi.createProject(input);
      await reload();
    },
    onSaved: (input) =>
      navigate("/admin/projects", { state: { flash: `Saved “${input.name}”.` } }),
  });
  const { values, update, errors } = form;

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>{project ? `Edit ${project.name}` : "New project"}</h1>
      </div>
      <form className={styles.form} onSubmit={form.onSubmit} noValidate>
        {form.submitError && (
          <p role="alert" tabIndex={-1} ref={form.alertRef} className={styles.alert}>
            {form.submitError}
          </p>
        )}

        <fieldset className={styles.fieldset}>
          <legend>Basics</legend>
          <Input
            label="Name"
            value={values.name}
            maxLength={LIMITS.name}
            error={errors.name}
            onChange={(event) => {
              const name = event.target.value;
              form.setValues((current) => ({
                ...current,
                name,
                slug: slugTouched ? current.slug : slugify(name),
              }));
            }}
          />
          <Input
            label="Slug"
            hint={`The page address: /work/${values.slug || "your-slug"}`}
            value={values.slug}
            maxLength={LIMITS.slug}
            error={errors.slug}
            onChange={(event) => {
              setSlugTouched(true);
              update("slug", event.target.value);
            }}
          />
          <Input
            label="Category"
            hint="e.g. Open-source AI platform"
            value={values.category}
            maxLength={LIMITS.category}
            error={errors.category}
            onChange={(event) => update("category", event.target.value)}
          />
          <Textarea
            label="Summary"
            hint="One or two sentences shown on the project card."
            value={values.summary}
            maxLength={LIMITS.projectSummary}
            rows={3}
            error={errors.summary}
            onChange={(event) => update("summary", event.target.value)}
          />
          <ChipInput
            label="Stack"
            values={values.stack}
            max={LIMITS.stackItems}
            maxLength={LIMITS.chip}
            error={errors.stack}
            onChange={(stack) => update("stack", stack)}
          />
          <Checkbox
            label="Published"
            hint="Unpublished projects are only visible here."
            checked={values.published}
            onChange={(event) => update("published", event.target.checked)}
          />
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Links</legend>
          <div className={styles.twoColumns}>
            <Input
              label="Source code link (optional)"
              type="url"
              value={values.repo_url}
              maxLength={LIMITS.url}
              error={errors.repo_url}
              onChange={(event) => update("repo_url", event.target.value)}
            />
            <Input
              label="Live demo link (optional)"
              type="url"
              value={values.demo_url}
              maxLength={LIMITS.url}
              error={errors.demo_url}
              onChange={(event) => update("demo_url", event.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Image</legend>
          <ImageUpload
            value={values.image}
            alt={values.image_alt}
            error={errors["image.width"] ?? errors["image.height"] ?? errors["image.key"]}
            onChange={(image) => update("image", image)}
          />
          {values.image && (
            <Input
              label="Alt text"
              hint="Describe the image for people who can't see it."
              value={values.image_alt}
              maxLength={LIMITS.imageAlt}
              error={errors["image.alt"]}
              onChange={(event) => update("image_alt", event.target.value)}
            />
          )}
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Case study</legend>
          <Checkbox
            label="This project has a case study page"
            checked={values.has_case_study}
            onChange={(event) => update("has_case_study", event.target.checked)}
          />
          {values.has_case_study && (
            <>
              <Textarea
                label="The problem"
                value={values.problem}
                maxLength={LIMITS.caseStudyText}
                rows={4}
                error={errors["case_study.problem"]}
                onChange={(event) => update("problem", event.target.value)}
              />
              <Textarea
                label="My role"
                value={values.role}
                maxLength={LIMITS.caseStudyText}
                rows={3}
                error={errors["case_study.role"]}
                onChange={(event) => update("role", event.target.value)}
              />
              <TextListField
                legend="Key decisions"
                itemLabel="Decision"
                values={values.decisions}
                max={LIMITS.decisions}
                maxLength={LIMITS.decision}
                errors={errors}
                errorKey="case_study.decisions"
                onChange={(decisions) => update("decisions", decisions)}
              />
              <Textarea
                label="Result"
                value={values.result}
                maxLength={LIMITS.caseStudyText}
                rows={3}
                error={errors["case_study.result"]}
                onChange={(event) => update("result", event.target.value)}
              />
            </>
          )}
        </fieldset>

        <div className={styles.formActions}>
          <Button type="submit" variant="primary" disabled={form.saving} aria-busy={form.saving}>
            {form.saving ? "Saving…" : project ? "Save changes" : "Create project"}
          </Button>
          <GuardedLink to="/admin/projects" className={styles.rowLink}>
            Cancel
          </GuardedLink>
        </div>
      </form>
    </>
  );
}
