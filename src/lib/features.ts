/** Build-time feature flags. Read at render time so tests can stub them per case. */
export function isPitchEnabled(): boolean {
  return import.meta.env.VITE_PITCH_ENABLED === "true";
}
