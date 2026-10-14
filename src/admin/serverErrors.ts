import { ApiError, errorCode } from "../lib/api";
import type { FieldErrors } from "./validation";

export interface SubmitError {
  /** Shown next to fields, keyed like the validators ("slug", "case_study.problem"). */
  fields: FieldErrors;
  /** Shown above the form (role="alert"). */
  message: string;
}

const SESSION_MESSAGE =
  "Your session ended or the request was blocked. Sign in again and retry; your changes are still here.";

/** Turns a failed save into field errors plus a summary message. */
export function toSubmitError(error: unknown): SubmitError {
  if (!(error instanceof ApiError)) {
    return { fields: {}, message: error instanceof Error ? error.message : "Saving failed." };
  }
  if (error.status === 401 || (error.status === 403 && errorCode(error) === "csrf")) {
    return { fields: {}, message: SESSION_MESSAGE };
  }
  if (error.status === 409) {
    return { fields: { slug: error.message }, message: "Fix the highlighted field and save again." };
  }
  if (error.status === 422 && Array.isArray(error.errors)) {
    const fields: FieldErrors = {};
    for (const item of error.errors as { loc?: unknown[]; msg?: string }[]) {
      const path = (item.loc ?? []).filter((part) => part !== "body").map(String);
      if (path.length === 0) continue;
      const message = item.msg ?? "This value isn't valid.";
      fields[path.join(".")] ??= message;
      fields[path[0]] ??= message; // also flag the top-level field so it's visible
    }
    return { fields, message: "Fix the highlighted fields and save again." };
  }
  return { fields: {}, message: error.message };
}
