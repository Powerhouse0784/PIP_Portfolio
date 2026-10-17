import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);
const BASE = process.env.BASE_URL ?? `http://localhost:${PORT}`;

// BASE_URL=https://your-site.vercel.app npm test   -> run the same checks against the live site.
export default defineConfig({
  testDir: "./tests",
  timeout: 40_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: BASE, trace: "retain-on-failure" },
  webServer: process.env.BASE_URL
    ? undefined
    : { command: `npm run build && npx next start -p ${PORT}`, url: BASE, reuseExistingServer: !process.env.CI, timeout: 240_000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
