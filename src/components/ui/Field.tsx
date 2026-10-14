import { type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, useId } from "react";

import styles from "./Field.module.css";

interface FieldChrome {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

function useFieldIds(id?: string) {
  const generated = useId();
  const controlId = id ?? generated;
  return { controlId, hintId: `${controlId}-hint`, errorId: `${controlId}-error` };
}

function describedBy(hint: ReactNode, error: ReactNode, ids: ReturnType<typeof useFieldIds>) {
  return [hint && ids.hintId, error && ids.errorId].filter(Boolean).join(" ") || undefined;
}

function Chrome({ label, hint, error, ids, children }: FieldChrome & {
  ids: ReturnType<typeof useFieldIds>;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={ids.controlId}>
        {label}
      </label>
      {hint && (
        <p className={styles.hint} id={ids.hintId}>
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p className={styles.error} id={ids.errorId}>
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = FieldChrome & Omit<InputHTMLAttributes<HTMLInputElement>, "children">;

export function Input({ label, hint, error, id, className, ...rest }: InputProps) {
  const ids = useFieldIds(id);
  return (
    <Chrome label={label} hint={hint} error={error} ids={ids}>
      <input
        id={ids.controlId}
        className={[styles.control, className].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint, error, ids)}
        {...rest}
      />
    </Chrome>
  );
}

type TextareaProps = FieldChrome & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "children">;

export function Textarea({ label, hint, error, id, className, ...rest }: TextareaProps) {
  const ids = useFieldIds(id);
  return (
    <Chrome label={label} hint={hint} error={error} ids={ids}>
      <textarea
        id={ids.controlId}
        className={[styles.control, className].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint, error, ids)}
        {...rest}
      />
    </Chrome>
  );
}
