import { normaliseSiteUrl } from "./siteMeta";

/** Public origin of the site, used for canonical and Open Graph URLs (VITE_SITE_URL). */
export const SITE_URL = normaliseSiteUrl(import.meta.env.VITE_SITE_URL);
