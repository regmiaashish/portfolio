import { useState } from "react";

import { Button } from "../../components/ui/Button";
import { Checkbox, Input, Select, Textarea } from "../../components/ui/Field";
import { type Profile, SOCIAL_KINDS, type Social } from "../../lib/cmsContracts";
import { useAdminContent } from "../adminContent";
import { adminApi } from "../api";
import styles from "../Admin.module.css";
import { LoadState } from "../components/LoadState";
import { ResumeField } from "../components/ResumeField";
import { useEntityForm } from "../useEntityForm";
import { LIMITS, validateProfile } from "../validation";

const KIND_OPTIONS = SOCIAL_KINDS.map((kind) => ({
  value: kind,
  label: { github: "GitHub", linkedin: "LinkedIn", instagram: "Instagram", x: "X", website: "Website" }[kind],
}));

interface ProfileValues extends Omit<Profile, "phone"> {
  hasPhone: boolean;
  phoneDisplay: string;
  phoneHref: string;
}

const EMPTY_PROFILE: Profile = {
  name: "",
  role: "",
  location: "",
  tagline: "",
  summary: "",
  email: "",
  phone: null,
  socials: [],
  resume_url: null,
};

function toValues(profile: Profile): ProfileValues {
  const { phone, ...rest } = profile;
  return {
    ...rest,
    hasPhone: phone !== null,
    phoneDisplay: phone?.display ?? "",
    phoneHref: phone?.href ?? "tel:",
  };
}

function toInput(values: ProfileValues): Profile {
  const { hasPhone, phoneDisplay, phoneHref, ...rest } = values;
  return {
    name: rest.name.trim(),
    role: rest.role.trim(),
    location: rest.location.trim(),
    tagline: rest.tagline.trim(),
    summary: rest.summary.trim(),
    email: rest.email.trim(),
    phone: hasPhone ? { display: phoneDisplay.trim(), href: phoneHref.trim() } : null,
    socials: rest.socials.map((social) => ({
      kind: social.kind,
      label: social.label.trim(),
      href: social.href.trim(),
    })),
    resume_url: rest.resume_url?.trim() || null,
  };
}

export function ProfileEditor() {
  const { status, content } = useAdminContent();
  if (status !== "ready" || !content) return <LoadState />;
  // The profile is null until the content has been seeded; saving creates it.
  return <ProfileForm profile={content.profile ?? EMPTY_PROFILE} isNew={content.profile === null} />;
}

function ProfileForm({ profile, isNew }: { profile: Profile; isNew: boolean }) {
  const { reload } = useAdminContent();
  const [saved, setSaved] = useState(false);
  const form = useEntityForm({
    initial: toValues(profile),
    toInput,
    validate: validateProfile,
    save: async (input) => {
      setSaved(false);
      await adminApi.saveProfile(input);
      await reload();
    },
    onSaved: () => setSaved(true),
  });
  const { values, update, errors } = form;

  const setSocial = (index: number, patch: Partial<Social>) =>
    update(
      "socials",
      values.socials.map((social, i) => (i === index ? { ...social, ...patch } : social)),
    );

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>Profile</h1>
      </div>
      {isNew && (
        <p className={styles.status}>
          No profile is saved yet, so the public site is showing its built-in copy. Fill this in
          and save to publish your own.
        </p>
      )}
      {saved && !form.dirty && (
        <p role="status" className={styles.status}>
          Profile saved. The public site shows it within a minute.
        </p>
      )}
      <form className={styles.form} onSubmit={form.onSubmit} noValidate>
        {form.submitError && (
          <p role="alert" tabIndex={-1} ref={form.alertRef} className={styles.alert}>
            {form.submitError}
          </p>
        )}
        <fieldset className={styles.fieldset}>
          <legend>About you</legend>
          <div className={styles.twoColumns}>
            <Input
              label="Name"
              value={values.name}
              maxLength={LIMITS.name}
              error={errors.name}
              onChange={(event) => update("name", event.target.value)}
            />
            <Input
              label="Role"
              value={values.role}
              maxLength={LIMITS.role}
              error={errors.role}
              onChange={(event) => update("role", event.target.value)}
            />
          </div>
          <Input
            label="Location"
            value={values.location}
            maxLength={LIMITS.location}
            error={errors.location}
            onChange={(event) => update("location", event.target.value)}
          />
          <Input
            label="Tagline"
            hint="The large heading at the top of the home page."
            value={values.tagline}
            maxLength={LIMITS.tagline}
            error={errors.tagline}
            onChange={(event) => update("tagline", event.target.value)}
          />
          <Textarea
            label="Summary"
            value={values.summary}
            maxLength={LIMITS.profileSummary}
            rows={5}
            error={errors.summary}
            onChange={(event) => update("summary", event.target.value)}
          />
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Contact</legend>
          <Input
            label="Email"
            type="email"
            value={values.email}
            error={errors.email}
            onChange={(event) => update("email", event.target.value)}
          />
          <Checkbox
            label="Show a phone number"
            checked={values.hasPhone}
            onChange={(event) => update("hasPhone", event.target.checked)}
          />
          {values.hasPhone && (
            <div className={styles.twoColumns}>
              <Input
                label="Phone (as shown)"
                hint="As visitors see it."
                value={values.phoneDisplay}
                maxLength={LIMITS.phoneDisplay}
                error={errors["phone.display"]}
                onChange={(event) => update("phoneDisplay", event.target.value)}
              />
              <Input
                label="Phone link"
                hint="Starts with tel:, no spaces."
                value={values.phoneHref}
                error={errors["phone.href"]}
                onChange={(event) => update("phoneHref", event.target.value)}
              />
            </div>
          )}
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Résumé</legend>
          <ResumeField
            value={values.resume_url}
            error={errors.resume_url}
            onChange={(url) => update("resume_url", url)}
          />
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Social links</legend>
          {errors.socials && <p className={styles.danger}>{errors.socials}</p>}
          <div className={styles.repeat}>
            {values.socials.map((social, index) => (
              <div key={index} className={styles.repeatRow}>
                <Select
                  label="Type"
                  value={social.kind}
                  options={KIND_OPTIONS}
                  error={errors[`socials.${index}.kind`]}
                  onChange={(event) => setSocial(index, { kind: event.target.value as Social["kind"] })}
                />
                <Input
                  label="Label"
                  value={social.label}
                  maxLength={LIMITS.socialLabel}
                  error={errors[`socials.${index}.label`]}
                  onChange={(event) => setSocial(index, { label: event.target.value })}
                />
                <Input
                  label="Link"
                  type="url"
                  value={social.href}
                  maxLength={LIMITS.url}
                  error={errors[`socials.${index}.href`]}
                  onChange={(event) => setSocial(index, { href: event.target.value })}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove ${social.label || `link ${index + 1}`}`}
                  onClick={() => update("socials", values.socials.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <div>
            <Button
              size="sm"
              disabled={values.socials.length >= LIMITS.socials}
              onClick={() =>
                update("socials", [...values.socials, { kind: "website", label: "", href: "https://" }])
              }
            >
              Add social link
            </Button>
          </div>
        </fieldset>

        <div className={styles.formActions}>
          <Button type="submit" variant="primary" disabled={form.saving} aria-busy={form.saving}>
            {form.saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </>
  );
}
