import { type FormEvent, useRef, useState } from "react";

import { toSubmitError } from "./serverErrors";
import { useUnsavedChanges } from "./unsaved";
import { type FieldErrors, hasErrors } from "./validation";

interface EntityFormOptions<Values, Input> {
  initial: Values;
  toInput: (values: Values) => Input;
  validate: (input: Input) => FieldErrors;
  save: (input: Input) => Promise<void>;
  onSaved: (input: Input) => void;
}

/**
 * Shared editor state: values, client validation (same rules as the server), server error
 * mapping, the unsaved-changes guard, and a busy flag. The summary alert receives focus when
 * a save is blocked, so keyboard and screen-reader users land on the explanation.
 */
export function useEntityForm<Values, Input>({
  initial,
  toInput,
  validate,
  save,
  onSaved,
}: EntityFormOptions<Values, Input>) {
  const [values, setValues] = useState<Values>(initial);
  const [baseline, setBaseline] = useState<Values>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const alertRef = useRef<HTMLParagraphElement>(null);

  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);
  const markSaved = useUnsavedChanges(dirty);

  const update = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const fail = (message: string, fieldErrors: FieldErrors) => {
    setErrors(fieldErrors);
    setSubmitError(message);
    requestAnimationFrame(() => alertRef.current?.focus());
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const input = toInput(values);
    const clientErrors = validate(input);
    if (hasErrors(clientErrors)) {
      fail("Fix the highlighted fields and save again.", clientErrors);
      return;
    }
    setErrors({});
    setSubmitError(null);
    setSaving(true);
    try {
      await save(input);
      setBaseline(values);
      markSaved();
      onSaved(input);
    } catch (reason) {
      const { fields, message } = toSubmitError(reason);
      fail(message, fields);
    } finally {
      setSaving(false);
    }
  };

  return { values, setValues, update, errors, submitError, saving, dirty, onSubmit, alertRef };
}
