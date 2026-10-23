import { defineConfig, devices } from "@playwright/test";

// Chromium only. The web server is the built Angular app alone: no API, database or container.
export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:4200",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command:
      "npm --prefix ../frontend run build && node fixtures/serve-app.mjs",
    url: "http://localhost:4200",
    // Always build fresh: a reused server could be serving an older build.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
