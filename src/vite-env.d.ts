/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the FastAPI backend, without a trailing slash. Required for builds. */
  readonly VITE_API_URL: string;
  /** Cloudflare Turnstile site key. Optional: without it the contact form has no widget. */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  /** "true" turns on the live Pitch Me demo. Anything else keeps the "coming soon" panel. */
  readonly VITE_PITCH_ENABLED?: string;
  /** Public origin of the site for canonical/Open Graph URLs. Default https://aashish-regmi.com.np */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
