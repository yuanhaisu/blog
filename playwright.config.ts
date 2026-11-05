import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    // The Playwright browser CDN is unreachable from this machine, so the
    // smoke test drives the locally installed Microsoft Edge instead.
    channel: 'msedge',
  },
  webServer: {
    command: 'node tests/static-server.mjs .output/public',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
