import { API_URL } from "./api";

/**
 * The backend redirects this to a short-lived download link that saves the PDF with a proper
 * file name. A plain `download` attribute doesn't work for files on another origin (S3).
 */
export const RESUME_DOWNLOAD_URL = `${API_URL}/api/v1/resume/download`;
