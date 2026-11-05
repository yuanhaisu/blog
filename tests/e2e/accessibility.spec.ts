import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { expect, test, type Page } from '@playwright/test'

const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')

const articlePath = '/posts/fixture-manifesto'
const missingPath = '/this-page-does-not-exist'

interface Violation {
  id: string
  impact: string | null
  help: string
  nodes: string[]
}

async function scan(page: Page): Promise<Violation[]> {
  await page.addScriptTag({ content: axeSource })
  await page.evaluate(() => document.fonts.ready)

  return page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: Function } }).axe
    const results = await axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
    })

    return results.violations.map(
      (violation: {
        id: string
        impact: string | null
        help: string
        nodes: Array<{ target: string[] }>
      }) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.map((node) => node.target.join(' ')),
      }),
    )
  })
}

function expectNoViolations(violations: Violation[], label: string) {
  expect(
    violations,
    `${label} 存在无障碍问题：\n${JSON.stringify(violations, null, 2)}`,
  ).toEqual([])
}

const lightPages = [
  { path: '/', label: '首页（浅色）' },
  { path: '/archive', label: '归档（浅色）' },
  { path: '/about', label: '关于（浅色）' },
  { path: articlePath, label: '文章（浅色）' },
  { path: missingPath, label: '404（浅色）' },
]

for (const entry of lightPages) {
  test(`${entry.label} 达到 WCAG AA`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(entry.path)

    expectNoViolations(await scan(page), entry.label)
  })
}

const darkPages = [
  { path: '/', label: '首页（深色）' },
  { path: articlePath, label: '文章（深色）' },
  { path: missingPath, label: '404（深色）' },
]

for (const entry of darkPages) {
  test(`${entry.label} 达到 WCAG AA`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(entry.path)

    expectNoViolations(await scan(page), entry.label)
  })
}

test.describe('360px 手机视口', () => {
  test.use({ viewport: { width: 360, height: 800 } })

  test('首页与文章页达到 WCAG AA', async ({ page }) => {
    for (const path of ['/', articlePath]) {
      await page.goto(path)
      expectNoViolations(await scan(page), `${path}（360px）`)
    }
  })
})

test('所有页面图片都有 alt 文本', async ({ page }) => {
  for (const path of ['/', '/archive', '/about', articlePath, missingPath]) {
    await page.goto(path)

    const images = await page.locator('img').evaluateAll((elements) =>
      elements.map((element) => ({
        src: element.getAttribute('src'),
        alt: element.getAttribute('alt'),
      })),
    )

    for (const image of images) {
      expect(image.alt, `${path} 的图片 ${image.src} 缺少 alt`).not.toBeNull()
      expect(
        image.alt?.trim(),
        `${path} 的图片 ${image.src} 的 alt 不应为空`,
      ).not.toBe('')
    }
  }

  await page.goto('/about')
  await expect(page.getByRole('img', { name: /袁海粟.*头像/ })).toBeVisible()
})
