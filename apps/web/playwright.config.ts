import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:3000";

process.env["NEXTAUTH_URL"] = baseURL;
process.env["DATABASE_URL"] = "mongodb://127.0.0.1:27017/finance";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  reporter: [["html", { outputFolder: "./playwright-report", open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
  webServer: {
    command: "node ./scripts/playwright-webserver.mjs",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
