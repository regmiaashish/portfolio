import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { configDefaults, defineConfig } from "vitest/config";

import { normaliseSiteUrl } from "./src/lib/siteMeta";
import { headersPlugin } from "./vite/headers";
import { apiOrigin, seoPlugin } from "./vite/seo";

export default defineConfig(({ command, mode }) => {
  // The Playwright build (scripts/build-e2e.mjs) reads no .env files at all, only the variables
  // the script sets, so a local .env or .env.local can't leak into the tested site. The
  // directory doesn't exist on purpose.
  const e2e = mode === "e2e";
  const envDir = e2e ? resolve(process.cwd(), "e2e", "no-env-files") : process.cwd();
  const env = loadEnv(mode, envDir, "VITE_");

  // A production build without an API URL would ship a site that silently calls nothing.
  if (command === "build" && !env.VITE_API_URL) {
    throw new Error(
      "VITE_API_URL is not set. Add it to .env.production (or the build environment), " +
        "e.g. VITE_API_URL=https://api.aashish-regmi.com.np",
    );
  }

  return {
    envDir,
    plugins: [
      react(),
      seoPlugin(normaliseSiteUrl(env.VITE_SITE_URL), env.VITE_API_URL, { preconnect: !e2e }),
      headersPlugin(apiOrigin(env.VITE_API_URL)),
    ],
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      // Playwright smoke tests run with `npm run e2e`, not Vitest.
      exclude: [...configDefaults.exclude, "e2e/**", "dist-e2e/**"],
      env: { VITE_API_URL: "https://api.test.example" },
      css: false, // behaviour tests: jsdom cannot evaluate media queries
      // Generous limits so the suite doesn't flake on a busy CI runner (lazy admin chunk, afterPaint).
      testTimeout: 15_000,
    },
  };
});
