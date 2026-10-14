import { type ChangeEvent, useId, useState } from "react";

import fieldStyles from "../../components/ui/Field.module.css";
import { Button } from "../../components/ui/Button";
import { ApiError, errorCode } from "../../lib/api";
import type { UploadRequest } from "../../lib/cmsContracts";
import { adminApi, uploadToS3 } from "../api";
import styles from "../Admin.module.css";
import { readImageSize } from "../images";
import {
  ALLOWED_IMAGE_TYPES,
  DEFAULT_MAX_UPLOAD_BYTES,
  safeFilename,
  validateImageFile,
} from "../validation";

export interface UploadedImage {
  key: string;
  url: string;
  width: number;
  height: number;
}

interface ImageUploadProps {
  value: UploadedImage | null;
  alt: string;
  onChange: (image: UploadedImage | null) => void;
  error?: string;
}

/**
 * Picks an image, checks it locally, asks the API for a presigned POST, then uploads the
 * file straight to S3 with a progress bar. The API never receives the file itself.
 */
export function ImageUpload({ value, alt, onChange, error }: ImageUploadProps) {
  const id = useId();
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = ""; // allow picking the same file again after an error
    if (!file) return;

    setUploadError(null);
    const problem = validateImageFile(file, DEFAULT_MAX_UPLOAD_BYTES);
    if (problem) {
      setUploadError(problem);
      return;
    }

    try {
      setProgress(0);
      const size = await readImageSize(file);
      const ticket = await adminApi.presignUpload({
        filename: safeFilename(file.name),
        // Safe: validateImageFile above only lets the four allowed types through.
        content_type: file.type as UploadRequest["content_type"],
        size: file.size,
      });
      const serverProblem = validateImageFile(file, ticket.max_bytes);
      if (serverProblem) throw new Error(serverProblem);
      await uploadToS3(ticket, file, setProgress);
      onChange({ key: ticket.key, url: ticket.public_url, width: size.width, height: size.height });
    } catch (reason) {
      if (reason instanceof ApiError && errorCode(reason) === "uploads_disabled") {
        setUploadError("Image uploads aren't configured on the server yet (S3 settings).");
      } else {
        setUploadError(reason instanceof Error ? reason.message : "The upload failed.");
      }
    } finally {
      setProgress(null);
    }
  };

  const uploading = progress !== null;
  const shownError = uploadError ?? error;

  return (
    <div className={styles.imageBox}>
      {value && (
        <img
          className={styles.preview}
          src={value.url}
          alt={alt || "Uploaded image preview"}
          width={value.width}
          height={value.height}
        />
      )}
      <div className={fieldStyles.field}>
        <label className={fieldStyles.label} htmlFor={id}>
          {value ? "Replace image" : "Upload an image"}
        </label>
        <p className={fieldStyles.hint} id={`${id}-hint`}>
          PNG, JPEG, WebP or AVIF, up to {DEFAULT_MAX_UPLOAD_BYTES / (1024 * 1024)} MB.
        </p>
        <input
          id={id}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
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
            aria-label="Upload progress"
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
            Remove image
          </Button>
        </div>
      )}
    </div>
  );
}
