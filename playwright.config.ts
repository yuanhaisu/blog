import { createHash } from 'node:crypto'
import { defineConfig } from '@playwright/test'

// Worktrees on the same machine may run Playwright concurrently. Derive a
// stable default port from the checkout path instead of contending for 4173,
// and allow an explicit override.
const portOffset =
  Number.parseInt(
    createHash('sha1').update(process.cwd()).digest('hex').slice(0, 4),
    16,
  ) % 1000
const port = Number(process.env.PLAYWRIGHT_PORT ?? 43000 + portOffset)
const baseURL = `http://127.0.0.1:${port}`

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
    baseURL,
    trace: 'on-first-retry',
    // The Playwright browser CDN is unreachable from this machine, so the
    // smoke test drives the locally installed Microsoft Edge instead.
    channel: 'msedge',
  },
  webServer: {
    command: 'node tests/static-server.mjs .output/public',
    env: { PORT: String(port) },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
