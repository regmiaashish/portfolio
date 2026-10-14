import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

import { normaliseSiteUrl } from "./src/lib/siteMeta";
import { seoPlugin } from "./vite/seo";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  // A production build without an API URL would ship a site that silently calls nothing.
  if (command === "build" && !env.VITE_API_URL) {
    throw new Error(
      "VITE_API_URL is not set. Add it to .env.production (or the build environment), " +
        "e.g. VITE_API_URL=https://api.aashish-regmi.com.np",
    );
  }

  return {
    plugins: [react(), seoPlugin(normaliseSiteUrl(env.VITE_SITE_URL))],
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      env: { VITE_API_URL: "https://api.test.example" },
      css: false, // behaviour tests: jsdom cannot evaluate media queries
    },
  };
});
