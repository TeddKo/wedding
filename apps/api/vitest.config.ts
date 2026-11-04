import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml", environment: "dev" },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations("./migrations"),
          IP_PEPPER: "test-pepper",
          ADMIN_TOKEN: "test-admin",
          VOTE_MODE: "device",
          VOTER_PEPPER: "test-voter",
          SESSION_SECRET: "test-session-secret",
          ORPHAN_MS: "2000",
          KAKAO_REST_KEY: "rk",
          KAKAO_CLIENT_SECRET: "cs",
        },
      },
    }),
  ],
  test: { setupFiles: ["./test/setup.ts"], testTimeout: 60_000 },
}));
