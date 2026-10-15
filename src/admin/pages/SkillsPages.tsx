import { useNavigate, useParams } from "react-router";

import { Button, ButtonLink } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Field";
import type { AdminSkillGroup, SkillGroupInput } from "../../lib/cmsContracts";
import { useAdminContent } from "../adminContent";
import { adminApi } from "../api";
import styles from "../Admin.module.css";
import { ChipInput } from "../components/ChipInput";
import { GuardedLink } from "../components/GuardedLink";
import { LoadState } from "../components/LoadState";
import { OrderedList } from "../components/OrderedList";
import { useEntityForm } from "../useEntityForm";
import { useFlash } from "../useFlash";
import { LIMITS, validateSkillGroup } from "../validation";

export function SkillsPage() {
  const { status, content, reload } = useAdminContent();
  const flash = useFlash();
  return (
    <>
      <div className={styles.pageHeader}>
        <h1>Skills</h1>
        <ButtonLink to="/admin/skills/new" variant="primary">
          Add skill group
        </ButtonLink>
      </div>
      {flash && (
        <p role="status" className={styles.status}>
          {flash}
        </p>
      )}
      {status !== "ready" || !content ? (
        <LoadState />
      ) : (
        <OrderedList
          label="Skill groups in display order"
          noun="skill group"
          items={content.skills.map((group) => ({
            id: group.id,
            title: group.title,
            editTo: `/admin/skills/${group.id}`,
            meta: <span>{group.skills.length} skills</span>,
          }))}
          onReorder={async (ids) => {
            await adminApi.orderSkillGroups(ids);
            await reload();
          }}
          onDelete={async (id) => {
            await adminApi.deleteSkillGroup(id);
            await reload();
          }}
        />
      )}
    </>
  );
}

const toSkillInput = (values: SkillGroupInput): SkillGroupInput => ({
  title: values.title.trim(),
  description: values.description.trim(),
  skills: values.skills,
});

export function SkillFormPage() {
  const { id } = useParams();
  const { status, content } = useAdminContent();
  if (status !== "ready" || !content) return <LoadState />;
  const group = id ? content.skills.find((item) => item.id === id) : undefined;
  if (id && !group) {
    return (
      <>
        <h1>Skill group not found</h1>
        <GuardedLink to="/admin/skills">Back to skills</GuardedLink>
      </>
    );
  }
  return <SkillForm key={id ?? "new"} group={group} />;
}

function SkillForm({ group }: { group?: AdminSkillGroup }) {
  const navigate = useNavigate();
  const { reload } = useAdminContent();
  // alertRef is kept apart from `form`: the React Compiler treats an object a ref is read from
  // as a ref, which would make every other form.* read during render an error.
  const { alertRef, ...form } = useEntityForm({
    initial: {
      title: group?.title ?? "",
      description: group?.description ?? "",
      skills: group?.skills ?? [],
    },
    toInput: toSkillInput,
    validate: validateSkillGroup,
    save: async (input) => {
      if (group) await adminApi.updateSkillGroup(group.id, input);
      else await adminApi.createSkillGroup(input);
      await reload();
    },
    onSaved: (input) => navigate("/admin/skills", { state: { flash: `Saved “${input.title}”.` } }),
  });
  const { values, update, errors } = form;

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>{group ? `Edit ${group.title}` : "New skill group"}</h1>
      </div>
      <form className={styles.form} onSubmit={form.onSubmit} noValidate>
        {form.submitError && (
          <p role="alert" tabIndex={-1} ref={alertRef} className={styles.alert}>
            {form.submitError}
          </p>
        )}
        <fieldset className={styles.fieldset}>
          <legend>Skill group</legend>
          <Input
            label="Title"
            value={values.title}
            maxLength={LIMITS.skillTitle}
            error={errors.title}
            onChange={(event) => update("title", event.target.value)}
          />
          <Textarea
            label="Description"
            value={values.description}
            maxLength={LIMITS.skillDescription}
            rows={3}
            error={errors.description}
            onChange={(event) => update("description", event.target.value)}
          />
          <ChipInput
            label="Skills"
            values={values.skills}
            max={LIMITS.skillItems}
            maxLength={LIMITS.chip}
            error={errors.skills}
            onChange={(skills) => update("skills", skills)}
          />
        </fieldset>
        <div className={styles.formActions}>
          <Button type="submit" variant="primary" disabled={form.saving} aria-busy={form.saving}>
            {form.saving ? "Saving…" : group ? "Save changes" : "Create skill group"}
          </Button>
          <GuardedLink to="/admin/skills" className={styles.rowLink}>
            Cancel
          </GuardedLink>
        </div>
      </form>
    </>
  );
}
