/** Mirrors the backend's rule for /api/v1/pitch/stream's company and role parameters. */
export const PITCH_MAX_LENGTH = 80;
export const PITCH_PATTERN = /^[\p{L}\p{N} .,&'()/+#-]{1,80}$/u;

export type PitchField = "company" | "role";

const LABELS: Record<PitchField, string> = { company: "a company", role: "a role" };

export function validatePitchField(field: PitchField, raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return `Enter ${LABELS[field]}.`;
  if (value.length > PITCH_MAX_LENGTH) return `Keep it to ${PITCH_MAX_LENGTH} characters or fewer.`;
  if (!PITCH_PATTERN.test(value)) {
    return "Use letters, numbers, spaces and . , & ' ( ) / + # - only.";
  }
  return undefined;
}
