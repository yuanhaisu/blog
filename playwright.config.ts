import { defineConfig } from '@playwright/test'

// Worktrees on the same machine may run Playwright concurrently; allow each
// run to use its own port instead of contending for 4173.
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173)

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
  projects: [
    {
      name: 'guardrails',
      testMatch: /guardrails\/.*\.spec\.ts/,
    },
    {
      name: 'e2e',
      testMatch: /e2e\/.*\.spec\.ts/,
    },
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'on-first-retry',
    // The Playwright browser CDN is unreachable from this machine, so the
    // smoke test drives the locally installed Microsoft Edge instead.
    channel: 'msedge',
  },
  webServer: {
    command: 'node tests/static-server.mjs .output/public',
    env: { PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
