import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against a throwaway `crc_test` database (created/reset by tests/e2e/global-setup.ts)
 * on port 3101, so your dev data is never touched.
 */
const PORT = 3101;
const TEST_DB = (process.env.DATABASE_URL ?? "postgres://crc:crc@localhost:5433/crc").replace(/\/[^/]+$/, "/crc_test");

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec\.ts/ },
    { name: "iphone", use: { ...devices["iPhone 13"], browserName: "chromium" }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: TEST_DB,
      MEDIA_DIR: "./data/media-test",
      NEXT_DIST_DIR: ".next-test",
    },
  },
});
