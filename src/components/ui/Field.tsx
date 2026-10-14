import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
  useState,
} from "react";

import styles from "./Field.module.css";
import { Icon } from "./Icon";

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

type PasswordInputProps = Omit<InputProps, "type">;

/**
 * Password field with a show/hide toggle. The toggle is a real button (keyboard reachable,
 * 44px target) whose name and pressed state tell screen readers what it does.
 */
export function PasswordInput({ label, hint, error, id, className, ...rest }: PasswordInputProps) {
  const ids = useFieldIds(id);
  const [visible, setVisible] = useState(false);
  return (
    <Chrome label={label} hint={hint} error={error} ids={ids}>
      <div className={styles.passwordWrap}>
        <input
          id={ids.controlId}
          type={visible ? "text" : "password"}
          className={[styles.control, styles.passwordControl, className].filter(Boolean).join(" ")}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(hint, error, ids)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          {...rest}
        />
        <button
          type="button"
          className={styles.reveal}
          onClick={() => setVisible((shown) => !shown)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          aria-controls={ids.controlId}
          title={visible ? "Hide password" : "Show password"}
        >
          <Icon name={visible ? "eyeOff" : "eye"} />
        </button>
      </div>
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

type SelectProps = FieldChrome &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
    options: { value: string; label: string }[];
  };

export function Select({ label, hint, error, id, className, options, ...rest }: SelectProps) {
  const ids = useFieldIds(id);
  return (
    <Chrome label={label} hint={hint} error={error} ids={ids}>
      <select
        id={ids.controlId}
        className={[styles.control, className].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint, error, ids)}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Chrome>
  );
}

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> & {
  label: ReactNode;
  hint?: ReactNode;
};

/** A checkbox with its label to the right and an optional hint below. */
export function Checkbox({ label, hint, id, className, ...rest }: CheckboxProps) {
  const ids = useFieldIds(id);
  return (
    <div className={[styles.checkboxField, className].filter(Boolean).join(" ")}>
      <input
        id={ids.controlId}
        type="checkbox"
        className={styles.checkbox}
        aria-describedby={hint ? ids.hintId : undefined}
        {...rest}
      />
      <label htmlFor={ids.controlId} className={styles.checkboxLabel}>
        {label}
      </label>
      {hint && (
        <p className={styles.checkboxHint} id={ids.hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}
