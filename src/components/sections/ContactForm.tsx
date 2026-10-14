import { type ChangeEvent, type FocusEvent, type FormEvent, useEffect, useRef, useState } from "react";

import { profile } from "../../data/profile";
import { useTheme } from "../../hooks/useTheme";
import { useTurnstile } from "../../hooks/useTurnstile";
import { ApiError, request } from "../../lib/api";
import {
  CONTACT_LIMITS,
  type ContactErrors,
  type ContactField,
  type ContactValues,
  fieldErrorsFromApi,
  validateContact,
  validateField,
} from "../../lib/contactValidation";
import type { ContactRequest } from "../../lib/contracts";
import { Button } from "../ui/Button";
import { Input, Textarea } from "../ui/Field";
import { StatusDot } from "../ui/StatusDot";
import styles from "./ContactForm.module.css";

const EMPTY: ContactValues = { name: "", email: "", message: "", website: "" };
const FIELD_IDS: Record<ContactField, string> = {
  name: "contact-name",
  email: "contact-email",
  message: "contact-message",
};
const DEFAULT_SUCCESS = "Thanks! Your message is on its way.";

type Status = "idle" | "sending" | "success" | "error";

export function ContactForm() {
  const { theme } = useTheme();
  const turnstile = useTurnstile(import.meta.env.VITE_TURNSTILE_SITE_KEY, theme);

  const [values, setValues] = useState<ContactValues>(EMPTY);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState(DEFAULT_SUCCESS);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  const onChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const field = event.target.name as keyof ContactValues;
    setValues((current) => ({ ...current, [field]: event.target.value }));
    // Once a field shows an error, re-check it as the visitor fixes it.
    if (field !== "website" && errors[field]) {
      setErrors((current) => ({ ...current, [field]: validateField(field, event.target.value) }));
    }
  };

  const onBlur = (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const field = event.target.name as ContactField;
    // Don't nag about an untouched empty field just because focus passed through it.
    if (!event.target.value && !errors[field]) return;
    setErrors((current) => ({ ...current, [field]: validateField(field, event.target.value) }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") return;

    const found = validateContact(values);
    setErrors(found);
    const firstInvalid = (Object.keys(FIELD_IDS) as ContactField[]).find((field) => found[field]);
    if (firstInvalid) {
      document.getElementById(FIELD_IDS[firstInvalid])?.focus();
      return;
    }
    if (turnstile.enabled && !turnstile.token) {
      setServerError("Please complete the verification check before sending.");
      return;
    }

    const body: ContactRequest = {
      name: values.name.trim(),
      email: values.email.trim(),
      message: values.message.trim(),
      website: values.website,
      ...(turnstile.enabled && turnstile.token ? { turnstile_token: turnstile.token } : {}),
    };

    setStatus("sending");
    setServerError(null);
    try {
      const response = await request<{ message?: unknown } | null>("/api/v1/contact", {
        method: "POST",
        body,
      });
      const message = response && typeof response.message === "string" ? response.message : "";
      setSuccessMessage(message || DEFAULT_SUCCESS);
      setValues(EMPTY);
      setErrors({});
      setStatus("success");
    } catch (error) {
      setStatus("error");
      turnstile.reset();
      if (error instanceof ApiError) {
        setErrors((current) => ({ ...current, ...fieldErrorsFromApi(error.errors) }));
        setServerError(error.message);
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    }
  };

  if (status === "success") {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className={styles.success}>
        <h3 className={styles.successTitle}>
          <StatusDot status="done" label="Success:" />
          Message sent
        </h3>
        <p>{successMessage}</p>
        <div>
          <Button size="sm" onClick={() => setStatus("idle")}>
            Send another message
          </Button>
        </div>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate aria-busy={sending} aria-label="Contact form">
      <div className={styles.row}>
        <Input
          id={FIELD_IDS.name}
          name="name"
          label="Name"
          autoComplete="name"
          required
          maxLength={CONTACT_LIMITS.name}
          value={values.name}
          onChange={onChange}
          onBlur={onBlur}
          error={errors.name}
        />
        <Input
          id={FIELD_IDS.email}
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={CONTACT_LIMITS.email}
          value={values.email}
          onChange={onChange}
          onBlur={onBlur}
          error={errors.email}
        />
      </div>

      <Textarea
        id={FIELD_IDS.message}
        name="message"
        label="Message"
        hint={`${values.message.length} / ${CONTACT_LIMITS.message} characters`}
        required
        rows={6}
        maxLength={CONTACT_LIMITS.message}
        value={values.message}
        onChange={onChange}
        onBlur={onBlur}
        error={errors.message}
      />

      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={onChange}
        />
      </div>

      {turnstile.enabled && <div ref={turnstile.containerRef} className={styles.turnstile} />}

      {serverError && (
        <p role="alert" className={styles.alert}>
          {serverError}{" "}
          {status === "error" && (
            <>
              You can also email me at <a href={`mailto:${profile.email}`}>{profile.email}</a>.
            </>
          )}
        </p>
      )}

      <div className={styles.actions}>
        <Button type="submit" variant="primary" disabled={sending}>
          {sending ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
