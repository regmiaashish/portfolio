import { type KeyboardEvent, useId, useState } from "react";

import fieldStyles from "../../components/ui/Field.module.css";
import styles from "../Admin.module.css";

interface ChipInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  max: number;
  maxLength: number;
  hint?: string;
  error?: string;
}

/** Type and press Enter or comma to add; Backspace in the empty box removes the last chip. */
export function ChipInput({ label, values, onChange, max, maxLength, hint, error }: ChipInputProps) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const full = values.length >= max;

  const add = () => {
    const value = draft.trim().replace(/,$/, "").trim();
    if (!value || full) return;
    if (!values.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
      onChange([...values, value.slice(0, maxLength)]);
    }
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add();
    } else if (event.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  const describedBy = [`${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");

  return (
    <div className={fieldStyles.field}>
      <label className={fieldStyles.label} htmlFor={id}>
        {label}
      </label>
      <p className={fieldStyles.hint} id={`${id}-hint`}>
        {hint ?? "Press Enter or comma to add."} {values.length}/{max} used.
      </p>
      {values.length > 0 && (
        <ul className={styles.chips} aria-label={`${label} added`}>
          {values.map((value, index) => (
            <li key={`${value}-${index}`} className={styles.chip}>
              {value}
              <button
                type="button"
                className={styles.chipRemove}
                aria-label={`Remove ${value}`}
                onClick={() => onChange(values.filter((_, i) => i !== index))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        className={fieldStyles.control}
        value={draft}
        maxLength={maxLength}
        disabled={full}
        placeholder={full ? `Limit of ${max} reached` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
      />
      {error && (
        <p className={fieldStyles.error} id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
