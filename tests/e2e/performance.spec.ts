import { expect, test, type Page } from '@playwright/test'

const articlePath = '/posts/why-i-started-one-person-delivery-notes'

interface PerformanceMetrics {
  lcp: number
  cls: number
}

declare global {
  interface Window {
    __performanceMetrics?: PerformanceMetrics
  }
}

async function observePerformance(page: Page) {
  await page.addInitScript(() => {
    const metrics: PerformanceMetrics = { lcp: 0, cls: 0 }
    window.__performanceMetrics = metrics

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        metrics.lcp = entry.startTime
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as PerformanceEntry & { hadRecentInput: boolean }).hadRecentInput) {
          metrics.cls += (entry as PerformanceEntry & { value: number }).value
        }
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
}

async function readMetrics(page: Page): Promise<PerformanceMetrics> {
  return page.evaluate(() => window.__performanceMetrics ?? { lcp: 0, cls: 0 })
}

test('代表性文章 LCP < 2.5s、CLS < 0.1', async ({ page }) => {
  await observePerformance(page)

  await page.goto(articlePath, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1_000)

  const { lcp, cls } = await readMetrics(page)

  expect(lcp).toBeGreaterThan(0)
  expect(lcp, `LCP 为 ${lcp}ms，超过 2500ms 预算`).toBeLessThan(2_500)
  expect(cls, `CLS 为 ${cls}，超过 0.1 预算`).toBeLessThan(0.1)
})

test('360px 手机视口下文章 LCP < 2.5s、CLS < 0.1', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await observePerformance(page)

  await page.goto(articlePath, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1_000)

  const { lcp, cls } = await readMetrics(page)

  expect(lcp).toBeGreaterThan(0)
  expect(lcp, `移动端 LCP 为 ${lcp}ms，超过 2500ms 预算`).toBeLessThan(2_500)
  expect(cls, `移动端 CLS 为 ${cls}，超过 0.1 预算`).toBeLessThan(0.1)
})

test('只加载站内子集字体，不加载完整 CJK 字体', async ({ page }) => {
  await page.goto(articlePath, { waitUntil: 'networkidle' })

  const fonts = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((entry) => /\.(woff2?|otf|ttf)$/i.test(entry.name))
      .map((entry) => ({
        path: new URL(entry.name).pathname,
        bytes: (entry as PerformanceResourceTiming).encodedBodySize,
      })),
  )

  expect(fonts.length).toBeGreaterThan(0)

  for (const font of fonts) {
    expect(font.path, `不应加载站外字体 ${font.path}`).toMatch(/^\/fonts\//)
    expect(
      font.bytes,
      `字体 ${font.path} 为 ${font.bytes} 字节，超过子集预算 300KB`,
    ).toBeLessThan(300 * 1024)
  }

  const fontCss = await page.evaluate(() =>
    Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join('\n')
        } catch {
          return ''
        }
      })
      .join('\n'),
  )

  expect(fontCss).toContain('font-display: swap')
  expect(fontCss).toMatch(/unicode-range:/)
})

test('字体未加载时正文仍可立即渲染', async ({ page }) => {
  let fontRequests = 0

  await page.route('**/fonts/*.woff2', async (route) => {
    fontRequests += 1
    await new Promise((resolve) => setTimeout(resolve, 3_000))
    await route.continue().catch(() => undefined)
  })

  const startedAt = Date.now()
  await page.goto(articlePath, { waitUntil: 'domcontentloaded' })

  await expect(
    page.getByRole('heading', { level: 1, name: /我为什么开始/ }),
  ).toBeVisible({ timeout: 1_500 })

  expect(Date.now() - startedAt).toBeLessThan(2_000)
  expect(fontRequests).toBeGreaterThan(0)

  await page.unrouteAll({ behavior: 'ignoreErrors' })
})
