/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the FastAPI backend, without a trailing slash. Required for builds. */
  readonly VITE_API_URL: string;
  /** Cloudflare Turnstile site key. Optional: without it the contact form has no widget. */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
