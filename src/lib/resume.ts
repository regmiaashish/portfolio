import { API_URL } from "./api";

/**
 * The backend redirects this to a short-lived download link that saves the PDF with a proper
 * file name. A plain `download` attribute doesn't work for files on another origin (S3).
 */
export const RESUME_DOWNLOAD_URL = `${API_URL}/api/v1/resume/download`;

/**
 * Whether the résumé can be shown inline. The site's CSP only lets the API's media route be
 * framed (`frame-src`), so a résumé hosted anywhere else is linked, never embedded.
 */
export function isEmbeddableResume(url: string): boolean {
  try {
    const target = new URL(url);
    return target.origin === new URL(API_URL).origin && target.pathname.startsWith("/api/v1/media/");
  } catch {
    return false;
  }
}
