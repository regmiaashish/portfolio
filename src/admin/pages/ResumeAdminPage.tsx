import { useState } from "react";

import { Button } from "../../components/ui/Button";
import type { Profile } from "../../lib/cmsContracts";
import { useAdminContent } from "../adminContent";
import { adminApi } from "../api";
import styles from "../Admin.module.css";
import { GuardedLink } from "../components/GuardedLink";
import { LoadState } from "../components/LoadState";
import { ResumeField } from "../components/ResumeField";
import { useEntityForm } from "../useEntityForm";
import { type FieldErrors, validateProfile } from "../validation";

/** The Résumé tab: upload, preview, replace or remove the PDF shown on the public /resume page. */
export function ResumeAdminPage() {
  const { status, content } = useAdminContent();
  if (status !== "ready" || !content) return <LoadState />;

  if (!content.profile) {
    return (
      <>
        <div className={styles.pageHeader}>
          <h1>Résumé</h1>
        </div>
        <p className={styles.status}>
          Save your <GuardedLink to="/admin/profile">profile</GuardedLink> first; the résumé is
          stored with it.
        </p>
      </>
    );
  }
  return <ResumeForm profile={content.profile} />;
}

function ResumeForm({ profile }: { profile: Profile }) {
  const { reload } = useAdminContent();
  const [saved, setSaved] = useState(false);
  const form = useEntityForm({
    initial: { resume_url: profile.resume_url ?? null },
    // Only the résumé changes; every other profile field is sent back exactly as stored.
    toInput: (values): Profile => ({ ...profile, resume_url: values.resume_url?.trim() || null }),
    validate: (input): FieldErrors => {
      const errors = validateProfile(input);
      return errors.resume_url ? { resume_url: errors.resume_url } : {};
    },
    save: async (input) => {
      setSaved(false);
      await adminApi.saveProfile(input);
      await reload();
    },
    onSaved: () => setSaved(true),
  });
  const current = form.values.resume_url;

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>Résumé</h1>
      </div>
      <p className={styles.status}>
        Visitors see it on the public <a href="/resume" target="_blank" rel="noopener noreferrer">
          Résumé page<span className="visually-hidden"> (opens in a new tab)</span>
        </a>{" "}
        with a download button; the home, About and Contact pages link to it.
      </p>
      {saved && !form.dirty && (
        <p role="status" className={styles.status}>
          Résumé saved. The public site shows it within a minute.
        </p>
      )}
      <form className={styles.form} onSubmit={form.onSubmit} noValidate>
        {form.submitError && (
          <p role="alert" tabIndex={-1} ref={form.alertRef} className={styles.alert}>
            {form.submitError}
          </p>
        )}
        <ResumeField
          value={current}
          error={form.errors.resume_url}
          onChange={(url) => form.update("resume_url", url)}
        />
        {current && /^https?:\/\//.test(current) && (
          <iframe
            className={styles.resumePreview}
            src={current}
            title="Preview of the current résumé"
            loading="lazy"
          />
        )}
        <div>
          <Button type="submit" variant="primary" disabled={form.saving} aria-busy={form.saving}>
            {form.saving ? "Saving…" : "Save résumé"}
          </Button>
        </div>
      </form>
    </>
  );
}
