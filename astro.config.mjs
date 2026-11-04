import { defineConfig } from "astro/config";

import svelte from "@astrojs/svelte";

export default defineConfig({
  site: "https://teddko.github.io",
  base: "/wedding",
  trailingSlash: "always",
  integrations: [svelte()],
  vite: { build: { chunkSizeWarningLimit: 3300 } },
});