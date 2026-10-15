// Builds the two sites the Playwright smoke tests serve (`npm run e2e:build`):
//   dist-e2e/site   like production: Pitch Me dark, no Turnstile
//   dist-e2e/pitch  the same with VITE_PITCH_ENABLED=true (the flag is read at build time)
// Both point at the real API URL so the generated CSP is the production one; the tests answer
// every API request themselves, so nothing reaches the real API.
import { build } from "vite";

const COMMON = {
  VITE_API_URL: "https://api.aashish-regmi.com.np",
  VITE_TURNSTILE_SITE_KEY: "", // the e2e build never loads the Turnstile widget
};

for (const [name, pitch] of [
  ["site", "false"],
  ["pitch", "true"],
]) {
  Object.assign(process.env, COMMON, { VITE_PITCH_ENABLED: pitch });
  // Mode "e2e": vite.config.ts then reads no .env files (envDir points at an empty location),
  // so only the variables set here reach the test build.
  await build({ mode: "e2e", logLevel: "warn", build: { outDir: `dist-e2e/${name}`, emptyOutDir: true } });
  console.log(`built dist-e2e/${name} (VITE_PITCH_ENABLED=${pitch})`);
}
