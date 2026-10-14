/** Client-side checks that mirror the backend's ContactRequest limits. */

export type ContactField = "name" | "email" | "message";

export interface ContactValues {
  name: string;
  email: string;
  message: string;
  website: string;
}

export const CONTACT_LIMITS = { name: 100, email: 254, message: 1000 } as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactErrors = Partial<Record<ContactField, string>>;

export function validateField(field: ContactField, raw: string): string | undefined {
  const value = raw.trim();
  switch (field) {
    case "name":
      if (!value) return "Please enter your name.";
      if (value.length > CONTACT_LIMITS.name)
        return `Please keep your name under ${CONTACT_LIMITS.name} characters.`;
      return undefined;
    case "email":
      if (!value) return "Please enter your email address.";
      if (value.length > CONTACT_LIMITS.email || !EMAIL_PATTERN.test(value))
        return "Please enter a valid email address, like name@example.com.";
      return undefined;
    case "message":
      if (!value) return "Please write a message.";
      if (value.length > CONTACT_LIMITS.message)
        return `Please keep your message under ${CONTACT_LIMITS.message} characters.`;
      return undefined;
  }
}

export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  for (const field of ["name", "email", "message"] as const) {
    const error = validateField(field, values[field]);
    if (error) errors[field] = error;
  }
  return errors;
}

/** Maps backend validation errors ({loc: ["body", "email"], msg}) onto form fields. */
export function fieldErrorsFromApi(errors: unknown): ContactErrors {
  const mapped: ContactErrors = {};
  if (!Array.isArray(errors)) return mapped;
  for (const item of errors) {
    if (!item || typeof item !== "object") continue;
    const { loc, msg } = item as { loc?: unknown; msg?: unknown };
    const field: unknown = Array.isArray(loc) ? loc[loc.length - 1] : undefined;
    if ((field === "name" || field === "email" || field === "message") && typeof msg === "string") {
      mapped[field] ??= msg;
    }
  }
  return mapped;
}
