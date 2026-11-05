import { expect, test } from '@playwright/test'

test('爬取站内链接，没有 404', async ({ page }) => {
  const queue = ['/']
  const visited = new Set<string>()

  while (queue.length > 0 && visited.size < 50) {
    const route = queue.shift()
    if (!route || visited.has(route)) {
      continue
    }
    visited.add(route)

    const response = await page.goto(route)
    expect(response?.status(), `访问 ${route} 应返回 200`).toBe(200)

    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href') ?? ''))

    for (const href of hrefs) {
      const url = new URL(href, page.url())
      if (url.origin !== new URL(page.url()).origin) {
        continue
      }
      if (url.pathname.startsWith('/_nuxt') || url.pathname.startsWith('/__nuxt_content')) {
        continue
      }
      queue.push(`${url.pathname}${url.search}`)
    }
  }

  expect(visited.size).toBeGreaterThan(1)
})
