import { type ChangeEvent, useId, useState } from "react";

import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import fieldStyles from "../../components/ui/Field.module.css";
import { ApiError, errorCode } from "../../lib/api";
import { adminApi, uploadToS3 } from "../api";
import styles from "../Admin.module.css";
import {
  DEFAULT_MAX_UPLOAD_BYTES,
  LIMITS,
  RESUME_TYPE,
  safeFilename,
  validateResumeFile,
} from "../validation";

interface ResumeFieldProps {
  value: string | null;
  onChange: (url: string | null) => void;
  error?: string;
}

/**
 * The résumé link shown on the public site: paste any URL, or upload a PDF straight to S3
 * (presigned POST with purpose "resume"). Saving the profile publishes it.
 */
export function ResumeField({ value, onChange, error }: ResumeFieldProps) {
  const id = useId();
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    setUploadError(null);
    const problem = validateResumeFile(file, DEFAULT_MAX_UPLOAD_BYTES);
    if (problem) {
      setUploadError(problem);
      return;
    }
    try {
      setProgress(0);
      const ticket = await adminApi.presignUpload({
        filename: safeFilename(file.name),
        content_type: RESUME_TYPE,
        size: file.size,
        purpose: "resume",
      });
      const serverProblem = validateResumeFile(file, ticket.max_bytes);
      if (serverProblem) throw new Error(serverProblem);
      await uploadToS3(ticket, file, setProgress);
      onChange(ticket.public_url);
    } catch (reason) {
      if (reason instanceof ApiError && errorCode(reason) === "uploads_disabled") {
        setUploadError("Uploads aren't configured on the server yet (S3 settings). Paste a link instead.");
      } else {
        setUploadError(reason instanceof Error ? reason.message : "The upload failed.");
      }
    } finally {
      setProgress(null);
    }
  };

  const uploading = progress !== null;
  const shownError = uploadError ?? undefined;

  return (
    <div className={styles.imageBox}>
      <Input
        label="Résumé link"
        hint="Shown as “Résumé (PDF)” on the home page and in Contact. Leave empty to hide it."
        type="url"
        value={value ?? ""}
        maxLength={LIMITS.url}
        error={error}
        onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
      />
      {value && (
        <p className={fieldStyles.hint}>
          Current:{" "}
          <a href={value} target="_blank" rel="noopener noreferrer">
            open the résumé<span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </p>
      )}
      <div className={fieldStyles.field}>
        <label className={fieldStyles.label} htmlFor={id}>
          {value ? "Replace with a PDF upload" : "Or upload a PDF"}
        </label>
        <p className={fieldStyles.hint} id={`${id}-hint`}>
          PDF, up to {DEFAULT_MAX_UPLOAD_BYTES / (1024 * 1024)} MB.
        </p>
        <input
          id={id}
          type="file"
          accept={RESUME_TYPE}
          disabled={uploading}
          aria-describedby={[`${id}-hint`, shownError && `${id}-error`].filter(Boolean).join(" ")}
          aria-invalid={shownError ? true : undefined}
          onChange={onFile}
        />
        {uploading && (
          <progress
            className={styles.progress}
            max={1}
            value={progress ?? 0}
            aria-label="Résumé upload progress"
          />
        )}
        {shownError && (
          <p className={fieldStyles.error} id={`${id}-error`} role="alert">
            {shownError}
          </p>
        )}
      </div>
      {value && !uploading && (
        <div>
          <Button size="sm" variant="ghost" className={styles.danger} onClick={() => onChange(null)}>
            Remove résumé
          </Button>
        </div>
      )}
    </div>
  );
}
