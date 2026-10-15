import { useNavigate, useParams } from "react-router";

import { Button, ButtonLink } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Field";
import type { AdminCareerEntry, CareerInput } from "../../lib/cmsContracts";
import { useAdminContent } from "../adminContent";
import { adminApi } from "../api";
import styles from "../Admin.module.css";
import { GuardedLink } from "../components/GuardedLink";
import { LoadState } from "../components/LoadState";
import { OrderedList } from "../components/OrderedList";
import { useEntityForm } from "../useEntityForm";
import { useFlash } from "../useFlash";
import { LIMITS, validateCareer } from "../validation";

export function CareerPage() {
  const { status, content, reload } = useAdminContent();
  const flash = useFlash();
  return (
    <>
      <div className={styles.pageHeader}>
        <h1>Career</h1>
        <ButtonLink to="/admin/career/new" variant="primary">
          Add entry
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
          label="Career entries in display order"
          noun="entry"
          items={content.career.map((entry) => ({
            id: entry.id,
            title: `${entry.role}, ${entry.company}`,
            editTo: `/admin/career/${entry.id}`,
            meta: <span>{entry.period}</span>,
          }))}
          onReorder={async (ids) => {
            await adminApi.orderCareer(ids);
            await reload();
          }}
          onDelete={async (id) => {
            await adminApi.deleteCareer(id);
            await reload();
          }}
        />
      )}
    </>
  );
}

const toCareerInput = (values: CareerInput): CareerInput => ({
  role: values.role.trim(),
  company: values.company.trim(),
  period: values.period.trim(),
  summary: values.summary.trim(),
});

export function CareerFormPage() {
  const { id } = useParams();
  const { status, content } = useAdminContent();
  if (status !== "ready" || !content) return <LoadState />;
  const entry = id ? content.career.find((item) => item.id === id) : undefined;
  if (id && !entry) {
    return (
      <>
        <h1>Entry not found</h1>
        <GuardedLink to="/admin/career">Back to career</GuardedLink>
      </>
    );
  }
  return <CareerForm key={id ?? "new"} entry={entry} />;
}

function CareerForm({ entry }: { entry?: AdminCareerEntry }) {
  const navigate = useNavigate();
  const { reload } = useAdminContent();
  // alertRef is kept apart from `form`: the React Compiler treats an object a ref is read from
  // as a ref, which would make every other form.* read during render an error.
  const { alertRef, ...form } = useEntityForm({
    initial: {
      role: entry?.role ?? "",
      company: entry?.company ?? "",
      period: entry?.period ?? "",
      summary: entry?.summary ?? "",
    },
    toInput: toCareerInput,
    validate: validateCareer,
    save: async (input) => {
      if (entry) await adminApi.updateCareer(entry.id, input);
      else await adminApi.createCareer(input);
      await reload();
    },
    onSaved: (input) =>
      navigate("/admin/career", { state: { flash: `Saved “${input.role}, ${input.company}”.` } }),
  });
  const { values, update, errors } = form;

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>{entry ? "Edit career entry" : "New career entry"}</h1>
      </div>
      <form className={styles.form} onSubmit={form.onSubmit} noValidate>
        {form.submitError && (
          <p role="alert" tabIndex={-1} ref={alertRef} className={styles.alert}>
            {form.submitError}
          </p>
        )}
        <fieldset className={styles.fieldset}>
          <legend>Entry</legend>
          <div className={styles.twoColumns}>
            <Input
              label="Role"
              value={values.role}
              maxLength={LIMITS.role}
              error={errors.role}
              onChange={(event) => update("role", event.target.value)}
            />
            <Input
              label="Company"
              value={values.company}
              maxLength={LIMITS.company}
              error={errors.company}
              onChange={(event) => update("company", event.target.value)}
            />
          </div>
          <Input
            label="Period"
            hint='e.g. "2024" or "Now"'
            value={values.period}
            maxLength={LIMITS.period}
            error={errors.period}
            onChange={(event) => update("period", event.target.value)}
          />
          <Textarea
            label="Summary"
            value={values.summary}
            maxLength={LIMITS.careerSummary}
            rows={4}
            error={errors.summary}
            onChange={(event) => update("summary", event.target.value)}
          />
        </fieldset>
        <div className={styles.formActions}>
          <Button type="submit" variant="primary" disabled={form.saving} aria-busy={form.saving}>
            {form.saving ? "Saving…" : entry ? "Save changes" : "Create entry"}
          </Button>
          <GuardedLink to="/admin/career" className={styles.rowLink}>
            Cancel
          </GuardedLink>
        </div>
      </form>
    </>
  );
}
