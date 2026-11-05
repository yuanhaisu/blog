import { createHash } from 'node:crypto'
import { defineConfig } from '@playwright/test'

// Other worktrees of this repository may run tests at the same time, so give
// each checkout its own port instead of sharing Playwright's default 4173.
const portOffset =
  Number.parseInt(
    createHash('sha1').update(process.cwd()).digest('hex').slice(0, 4),
    16,
  ) % 1000
const port = 43000 + portOffset
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    // The Playwright browser CDN is unreachable from this machine, so the
    // smoke test drives the locally installed Microsoft Edge instead.
    channel: 'msedge',
  },
  webServer: {
    command: 'node tests/static-server.mjs .output/public',
    url: baseURL,
    // Never reuse a server from another run: a stale process can serve an old
    // build or belong to a different worktree.
    reuseExistingServer: false,
    env: { PORT: String(port) },
    timeout: 30_000,
  },
})
