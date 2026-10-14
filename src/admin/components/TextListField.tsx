import fieldStyles from "../../components/ui/Field.module.css";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/Field";
import styles from "../Admin.module.css";
import type { FieldErrors } from "../validation";

interface TextListFieldProps {
  legend: string;
  itemLabel: string;
  values: string[];
  onChange: (values: string[]) => void;
  max: number;
  maxLength: number;
  errors: FieldErrors;
  errorKey: string;
}

/** A list of short text entries (e.g. case-study decisions) with add/remove. */
export function TextListField({
  legend,
  itemLabel,
  values,
  onChange,
  max,
  maxLength,
  errors,
  errorKey,
}: TextListFieldProps) {
  return (
    <fieldset className={styles.fieldset}>
      <legend>{legend}</legend>
      {errors[errorKey] && <p className={fieldStyles.error}>{errors[errorKey]}</p>}
      <div className={styles.repeat}>
        {values.map((value, index) => (
          <div key={index} className={`${styles.repeatRow} ${styles.repeatRowSingle}`}>
            <Textarea
              label={`${itemLabel} ${index + 1}`}
              value={value}
              maxLength={maxLength}
              rows={2}
              error={errors[`${errorKey}.${index}`]}
              onChange={(event) =>
                onChange(values.map((item, i) => (i === index ? event.target.value : item)))
              }
            />
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
              onClick={() => onChange(values.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      <div>
        <Button size="sm" disabled={values.length >= max} onClick={() => onChange([...values, ""])}>
          Add {itemLabel.toLowerCase()}
        </Button>
      </div>
    </fieldset>
  );
}
